import { Injectable } from '@nestjs/common';
import { canConfirmRequirement } from '@paper/domain';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService, permissionsFor } from '../access/access.service';
import { AccessDenied, ValidationFailed } from '../common/errors';
import type {
  CreateRequirementDto,
  ListRequirementsQuery,
  UpdateRequirementDto,
} from './requirements.dto';

const clean = (value: string | null | undefined) =>
  value === undefined ? undefined : value?.trim() || null;

/** Statuses only a confirming role (Main Author / Verifier / Supervisor) may set. */
const CONFIRMING_STATUSES = ['VERIFIED', 'NOT_APPLICABLE'];

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(userId: string, targetId: string, query: ListRequirementsQuery) {
    await this.access.forTarget(userId, targetId);

    const items = await this.prisma.requirement.findMany({
      where: {
        targetId,
        status: query.status,
        type: query.type,
        ...(query.q
          ? { description: { contains: query.q, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { evidence: true, verifications: true } },
        taskLinks: {
          include: {
            task: { select: { id: true, title: true, status: true } },
          },
        },
        verifications: {
          orderBy: { verifiedAt: 'desc' },
          take: 1,
          select: { result: true, verifiedAt: true },
        },
      },
    });

    return items.map((r) => ({
      id: r.id,
      description: r.description,
      type: r.type,
      status: r.status,
      sourceType: r.sourceType,
      sourceUrl: r.sourceUrl,
      sourceSection: r.sourceSection,
      condition: r.condition,
      needsEvidence: r.needsEvidence,
      copiedFromId: r.copiedFromId,
      evidenceCount: r._count.evidence,
      verificationCount: r._count.verifications,
      latestVerification: r.verifications[0] ?? null,
      tasks: r.taskLinks.map((l) => l.task),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async detail(userId: string, requirementId: string) {
    const { requirement, target, paper, role } =
      await this.access.forRequirement(userId, requirementId);

    const full = await this.prisma.requirement.findUniqueOrThrow({
      where: { id: requirement.id },
      include: {
        taskLinks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                dueAt: true,
                assignee: { select: { id: true, displayName: true } },
              },
            },
          },
        },
        evidence: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, displayName: true } } },
        },
        verifications: {
          orderBy: { verifiedAt: 'desc' },
          include: {
            verifier: { select: { id: true, displayName: true } },
            evidence: { select: { id: true, description: true, type: true } },
          },
        },
      },
    });

    const { taskLinks, ...rest } = full;

    return {
      ...rest,
      tasks: taskLinks.map((l) => l.task),
      target: {
        id: target.id,
        conferenceName: target.conferenceName,
        acronym: target.acronym,
        status: target.status,
      },
      paper: { id: paper.id, title: paper.title },
      permissions: {
        ...permissionsFor(role),
        writable: target.status === 'ACTIVE',
      },
    };
  }

  async create(userId: string, targetId: string, dto: CreateRequirementDto) {
    const { target, role } = await this.access.forTarget(userId, targetId);
    this.access.assertManage(role);
    this.access.assertWritable(target);
    this.assertStatusAllowed(role, dto.status);

    const created = await this.prisma.requirement.create({
      data: {
        targetId,
        description: dto.description.trim(),
        type: dto.type,
        sourceType: dto.sourceType,
        sourceUrl: clean(dto.sourceUrl) ?? null,
        sourceSection: clean(dto.sourceSection) ?? null,
        condition: clean(dto.condition) ?? null,
        needsEvidence: dto.needsEvidence ?? false,
        // BR-04/BR-05: unclear items are flagged for review instead of assumed to be met.
        status: dto.status ?? 'NOT_REVIEWED',
      },
    });

    return { id: created.id };
  }

  async update(userId: string, requirementId: string, dto: UpdateRequirementDto) {
    const { requirement, target, role } = await this.access.forRequirement(
      userId,
      requirementId,
    );
    this.access.assertWritable(target);

    const definitionChanged = [
      dto.description,
      dto.type,
      dto.sourceType,
      dto.sourceUrl,
      dto.sourceSection,
      dto.condition,
      dto.needsEvidence,
    ].some((v) => v !== undefined);

    if (definitionChanged) this.access.assertManage(role);
    this.assertStatusAllowed(role, dto.status);

    await this.prisma.requirement.update({
      where: { id: requirement.id },
      data: {
        description: dto.description?.trim(),
        type: dto.type,
        sourceType: dto.sourceType,
        sourceUrl: clean(dto.sourceUrl),
        sourceSection: clean(dto.sourceSection),
        condition: clean(dto.condition),
        needsEvidence: dto.needsEvidence,
        status: dto.status,
      },
    });

    return { id: requirement.id };
  }

  async remove(userId: string, requirementId: string) {
    const { requirement, target, role } = await this.access.forRequirement(
      userId,
      requirementId,
    );
    this.access.assertManage(role);
    this.access.assertWritable(target);

    await this.prisma.requirement.delete({ where: { id: requirement.id } });
    return { ok: true };
  }

  /** FR-14 / FR-21: replace the set of tasks linked to a requirement. */
  async linkTasks(userId: string, requirementId: string, taskIds: string[]) {
    const { requirement, target, role } = await this.access.forRequirement(
      userId,
      requirementId,
    );
    this.access.assertManage(role);
    this.access.assertWritable(target);

    const unique = [...new Set(taskIds)];
    const tasks = await this.prisma.task.findMany({
      where: { id: { in: unique }, targetId: target.id },
      select: { id: true },
    });
    if (tasks.length !== unique.length) {
      throw new ValidationFailed(
        'Task phải thuộc cùng Submission Target với Requirement.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.taskRequirement.deleteMany({
        where: { requirementId: requirement.id },
      }),
      this.prisma.taskRequirement.createMany({
        data: unique.map((taskId) => ({
          taskId,
          requirementId: requirement.id,
        })),
      }),
    ]);

    return { id: requirement.id, taskIds: unique };
  }

  private assertStatusAllowed(
    role: Parameters<typeof canConfirmRequirement>[0],
    status: string | undefined,
  ) {
    if (status && CONFIRMING_STATUSES.includes(status) && !canConfirmRequirement(role)) {
      throw new AccessDenied(
        'Chỉ Main Author, Verifier hoặc Supervisor mới được xác nhận đáp ứng / không áp dụng.',
      );
    }
  }
}
