import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildRequirementCopy, buildTaskCopy } from '@paper/domain';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService, permissionsFor } from '../access/access.service';
import { Conflict, ValidationFailed } from '../common/errors';
import { ReadinessService, compactReadiness } from './readiness.service';
import type {
  ListTargetsQuery,
  TargetFieldsDto,
  TransferTargetDto,
  UpdateTargetDto,
} from './targets.dto';

type DateInput = string | null | undefined;

const toDate = (value: DateInput): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return new Date(value);
};

const clean = (value: string | null | undefined) =>
  value === undefined ? undefined : value?.trim() || null;

function assertTimezone(timezone: string | undefined) {
  if (timezone === undefined) return;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    throw new ValidationFailed(`Múi giờ không hợp lệ: ${timezone}`);
  }
}

const activeExists = () =>
  new Conflict(
  'ACTIVE_TARGET_EXISTS',
  'Bài báo đã có một Submission Target đang hoạt động. Hãy chuyển hoặc lưu trữ mục tiêu hiện tại trước.',
);

@Injectable()
export class TargetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly readiness: ReadinessService,
  ) {}

  async list(userId: string, query: ListTargetsQuery) {
    const groupIds = await this.access.groupIdsOf(userId);

    const targets = await this.prisma.submissionTarget.findMany({
      where: {
        paper: { groupId: { in: groupIds } },
        status: query.status,
        paperId: query.paperId,
      },
      orderBy: [{ archivedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        paper: { select: { id: true, title: true, group: { select: { name: true } } } },
        archivedBy: { select: { displayName: true } },
        _count: { select: { requirements: true, tasks: true } },
      },
    });

    return targets.map((t) => ({
      id: t.id,
      status: t.status,
      conferenceName: t.conferenceName,
      acronym: t.acronym,
      edition: t.edition,
      conferenceYear: t.conferenceYear,
      track: t.track,
      fullPaperDeadline: t.fullPaperDeadline,
      archivedAt: t.archivedAt,
      archiveReason: t.archiveReason,
      archivedByName: t.archivedBy?.displayName ?? null,
      createdAt: t.createdAt,
      paper: { id: t.paper.id, title: t.paper.title, groupName: t.paper.group.name },
      requirementCount: t._count.requirements,
      taskCount: t._count.tasks,
    }));
  }

  async detail(userId: string, targetId: string) {
    const { target, paper, role } = await this.access.forTarget(userId, targetId);

    const [group, previous, next, counts] = await Promise.all([
      this.prisma.researchGroup.findUniqueOrThrow({
        where: { id: paper.groupId },
        select: { id: true, name: true },
      }),
      target.previousTargetId
        ? this.prisma.submissionTarget.findUnique({
            where: { id: target.previousTargetId },
            select: { id: true, conferenceName: true, acronym: true, conferenceYear: true },
          })
        : null,
      this.prisma.submissionTarget.findFirst({
        where: { previousTargetId: target.id },
        select: { id: true, conferenceName: true, acronym: true, conferenceYear: true },
      }),
      this.prisma.submissionTarget.findUniqueOrThrow({
        where: { id: target.id },
        select: { _count: { select: { requirements: true, tasks: true } } },
      }),
    ]);

    const archivedBy = target.archivedById
      ? await this.prisma.user.findUnique({
          where: { id: target.archivedById },
          select: { displayName: true },
        })
      : null;

    return {
      ...target,
      paper: { id: paper.id, title: paper.title, manuscriptUrl: paper.manuscriptUrl },
      group,
      archivedByName: archivedBy?.displayName ?? null,
      previousTarget: previous,
      nextTarget: next,
      counts: counts._count,
      permissions: {
        ...permissionsFor(role),
        // BR-10: no ordinary edits on an archived target.
        canEdit: role === 'MAIN_AUTHOR' && target.status === 'ACTIVE',
      },
    };
  }

  async create(userId: string, paperId: string, dto: TargetFieldsDto) {
    const { role } = await this.access.forPaper(userId, paperId);
    this.access.assertManage(role);
    assertTimezone(dto.timezone);

    try {
      const target = await this.prisma.$transaction(async (tx) => {
        // BR-03: friendly check; the partial unique index is the final guard.
        const active = await tx.submissionTarget.count({
          where: { paperId, status: 'ACTIVE' },
        });
        if (active > 0) throw activeExists();
        return tx.submissionTarget.create({ data: this.createData(paperId, dto) });
      });
      return { id: target.id };
    } catch (error) {
      if (this.isUniqueViolation(error)) throw activeExists();
      throw error;
    }
  }

  async update(userId: string, targetId: string, dto: UpdateTargetDto) {
    const { target, role } = await this.access.forTarget(userId, targetId);
    this.access.assertManage(role);
    this.access.assertWritable(target);
    assertTimezone(dto.timezone);

    await this.prisma.submissionTarget.update({
      where: { id: targetId },
      data: {
        conferenceName: dto.conferenceName?.trim(),
        acronym: clean(dto.acronym),
        edition: clean(dto.edition),
        conferenceYear: dto.conferenceYear,
        track: clean(dto.track),
        cfpUrl: clean(dto.cfpUrl),
        authorGuidelinesUrl: clean(dto.authorGuidelinesUrl),
        timezone: dto.timezone,
        abstractDeadline: toDate(dto.abstractDeadline),
        fullPaperDeadline: toDate(dto.fullPaperDeadline),
        notificationDate: toDate(dto.notificationDate),
        deadlineSource: clean(dto.deadlineSource),
      },
    });

    return { id: targetId };
  }

  /** FR-39: archive without creating a new target. */
  async archive(userId: string, targetId: string, reason?: string) {
    const { target, role } = await this.access.forTarget(userId, targetId);
    this.access.assertManage(role);
    this.access.assertWritable(target);

    await this.prisma.submissionTarget.update({
      where: { id: targetId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        archivedById: userId,
        archiveReason: reason?.trim() || null,
      },
    });

    return { id: targetId };
  }

  /**
   * Workflow B (FR-39..FR-47): archive the old target, create an independent new
   * one and optionally make controlled copies. Everything happens in a single
   * transaction so that a failure never leaves the paper without history
   * or in an undefined state (NFR-05).
   *
   * Evidence and Verification are never copied (BR-14, FR-46).
   */
  async transfer(userId: string, targetId: string, dto: TransferTargetDto) {
    const { target: oldTarget, role } = await this.access.forTarget(userId, targetId);
    this.access.assertManage(role);
    this.access.assertWritable(oldTarget);
    assertTimezone(dto.newTarget.timezone);

    const requirementIds = [...new Set(dto.copyRequirementIds ?? [])];
    const taskIds = [...new Set(dto.copyTaskIds ?? [])];

    try {
      return await this.prisma.$transaction(async (tx) => {
        const [requirements, tasks, links] = await Promise.all([
          tx.requirement.findMany({
            where: { id: { in: requirementIds }, targetId: oldTarget.id },
          }),
          tx.task.findMany({
            where: { id: { in: taskIds }, targetId: oldTarget.id },
          }),
          tx.taskRequirement.findMany({
            where: {
              taskId: { in: taskIds },
              requirementId: { in: requirementIds },
            },
          }),
        ]);

        if (requirements.length !== requirementIds.length || tasks.length !== taskIds.length) {
          throw new ValidationFailed(
            'Một số Requirement/Task được chọn không thuộc Submission Target hiện tại.',
          );
        }

        const archived = await tx.submissionTarget.updateMany({
          where: { id: oldTarget.id, status: 'ACTIVE' },
          data: {
            status: 'ARCHIVED',
            archivedAt: new Date(),
            archivedById: userId,
            archiveReason: dto.reason?.trim() || null,
          },
        });
        if (archived.count !== 1) throw activeExists();

        const created = await tx.submissionTarget.create({
          data: {
            ...this.createData(oldTarget.paperId, dto.newTarget),
            previousTargetId: oldTarget.id,
          },
        });

        const requirementMap = new Map<string, string>();
        for (const source of requirements) {
          const copy = await tx.requirement.create({
            data: { ...buildRequirementCopy(source), targetId: created.id },
          });
          requirementMap.set(source.id, copy.id);
        }

        const taskMap = new Map<string, string>();
        for (const source of tasks) {
          const copy = await tx.task.create({
            data: {
              ...buildTaskCopy(source),
              targetId: created.id,
              createdById: userId,
            },
          });
          taskMap.set(source.id, copy.id);
        }

        // Keep a Task ↔ Requirement relation only when both ends were copied.
        const newLinks = links
          .map((l) => ({
            taskId: taskMap.get(l.taskId),
            requirementId: requirementMap.get(l.requirementId),
          }))
          .filter(
            (l): l is { taskId: string; requirementId: string } =>
              Boolean(l.taskId && l.requirementId),
          );
        if (newLinks.length) {
          await tx.taskRequirement.createMany({ data: newLinks });
        }

        return {
          id: created.id,
          archivedTargetId: oldTarget.id,
          copiedRequirements: requirementMap.size,
          copiedTasks: taskMap.size,
        };
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw activeExists();
      throw error;
    }
  }

  async readinessView(userId: string, targetId: string) {
    const { target } = await this.access.forTarget(userId, targetId);

    const summary = await this.readiness.forTarget(target);

    // Names/ids only; the UI links through to the requirement itself (FR-38).
    const pick = (items: { id: string; description: string; type: string; status: string }[]) =>
      items.map(({ id, description, type, status }) => ({ id, description, type, status }));

    const openRequirements = await this.prisma.requirement.findMany({
      where: {
        targetId,
        status: { in: ['NOT_REVIEWED', 'NEEDS_ACTION', 'PENDING_VERIFICATION'] },
      },
      select: { id: true, description: true, type: true, status: true },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });

    const assignees = await this.prisma.user.findMany({
      where: { id: { in: summary.tasks.overdue.map((t) => t.assigneeId).filter(Boolean) as string[] } },
      select: { id: true, displayName: true },
    });

    return {
      compact: compactReadiness(summary),
      requirements: {
        counts: {
          total: summary.requirements.total,
          verified: summary.requirements.verified,
          notReviewed: summary.requirements.notReviewed,
          needsAction: summary.requirements.needsAction,
          pendingVerification: summary.requirements.pendingVerification,
          notApplicable: summary.requirements.notApplicable,
        },
        mandatoryOutstanding: pick(summary.requirements.mandatoryOutstanding),
        missingEvidence: pick(summary.requirements.missingEvidence),
        tasksDoneAwaitingConfirmation: pick(
          summary.requirements.tasksDoneAwaitingConfirmation,
        ),
        open: openRequirements,
      },
      tasks: {
        ...summary.tasks,
        overdue: summary.tasks.overdue.map((t) => ({
          id: t.id,
          title: t.title,
          dueAt: t.dueAt,
          status: t.status,
          assigneeName:
            assignees.find((a) => a.id === t.assigneeId)?.displayName ?? null,
        })),
      },
      deadlines: summary.deadlines,
      generatedAt: new Date(),
    };
  }

  private createData(paperId: string, dto: TargetFieldsDto): Prisma.SubmissionTargetUncheckedCreateInput {
    return {
      paperId,
      conferenceName: dto.conferenceName.trim(),
      acronym: clean(dto.acronym) ?? null,
      edition: clean(dto.edition) ?? null,
      conferenceYear: dto.conferenceYear ?? null,
      track: clean(dto.track) ?? null,
      cfpUrl: clean(dto.cfpUrl) ?? null,
      authorGuidelinesUrl: clean(dto.authorGuidelinesUrl) ?? null,
      timezone: dto.timezone?.trim() || 'UTC',
      abstractDeadline: toDate(dto.abstractDeadline) ?? null,
      fullPaperDeadline: toDate(dto.fullPaperDeadline) ?? null,
      notificationDate: toDate(dto.notificationDate) ?? null,
      deadlineSource: clean(dto.deadlineSource) ?? null,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}

