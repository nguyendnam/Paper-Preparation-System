import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService, permissionsFor } from '../access/access.service';
import { AccessDenied, ValidationFailed } from '../common/errors';
import type {
  CreateTaskDto,
  ListMyTasksQuery,
  ListTasksQuery,
  UpdateTaskDto,
} from './tasks.dto';

const taskInclude = {
  assignee: { select: { id: true, displayName: true, email: true } },
  requirementLinks: {
    include: {
      requirement: {
        select: { id: true, description: true, type: true, status: true },
      },
    },
  },
} as const;

type TaskWithRelations = Awaited<
  ReturnType<TasksService['findOneWithRelations']>
>;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  private serialize(task: NonNullable<TaskWithRelations>) {
    const { requirementLinks, ...rest } = task;
    return { ...rest, requirements: requirementLinks.map((l) => l.requirement) };
  }

  findOneWithRelations(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });
  }

  async list(userId: string, targetId: string, query: ListTasksQuery) {
    const { target, role } = await this.access.forTarget(userId, targetId);

    const tasks = await this.prisma.task.findMany({
      where: { targetId, status: query.status, assigneeId: query.assigneeId },
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      include: taskInclude,
    });

    return {
      permissions: { ...permissionsFor(role), writable: target.status === 'ACTIVE' },
      items: tasks.map((t) => this.serialize(t)),
    };
  }

  /** FR-22: open work assigned to the current user across all active targets. */
  async mine(userId: string, query: ListMyTasksQuery) {
    const groupIds = await this.access.groupIdsOf(userId);

    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeId: userId,
        target: { status: 'ACTIVE', paper: { groupId: { in: groupIds } } },
        status: query.status
          ? query.status
          : query.includeDone === 'true'
            ? undefined
            : { not: 'DONE' },
      },
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      include: {
        ...taskInclude,
        target: {
          select: {
            id: true,
            conferenceName: true,
            acronym: true,
            paper: { select: { id: true, title: true } },
          },
        },
      },
    });

    return tasks.map((t) => {
      const { requirementLinks, ...rest } = t;
      return { ...rest, requirements: requirementLinks.map((l) => l.requirement) };
    });
  }

  async create(userId: string, targetId: string, dto: CreateTaskDto) {
    const { target, paper, role } = await this.access.forTarget(userId, targetId);
    this.access.assertManage(role);
    this.access.assertWritable(target);

    await this.assertAssignee(paper.groupId, dto.assigneeId);
    const requirementIds = await this.validRequirementIds(targetId, dto.requirementIds);

    const task = await this.prisma.task.create({
      data: {
        targetId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        assigneeId: dto.assigneeId ?? null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        status: dto.status ?? 'TODO',
        createdById: userId,
        requirementLinks: requirementIds.length
          ? { create: requirementIds.map((requirementId) => ({ requirementId })) }
          : undefined,
      },
    });

    return { id: task.id };
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const { task, target, paper, role } = await this.access.forTask(userId, taskId);
    this.access.assertWritable(target);

    const isManager = role === 'MAIN_AUTHOR';
    const isAssignee = task.assigneeId === userId;

    // FR-17/FR-20: assignee may only report progress; Main Author may edit everything.
    const onlyStatus = Object.keys(dto).every((k) => k === 'status');
    if (!isManager && !(isAssignee && onlyStatus)) {
      throw new AccessDenied(
        'Chỉ Main Author hoặc người phụ trách mới được cập nhật Task (người phụ trách chỉ đổi trạng thái).',
      );
    }

    if (dto.assigneeId !== undefined) {
      await this.assertAssignee(paper.groupId, dto.assigneeId);
    }
    const requirementIds =
      dto.requirementIds === undefined
        ? undefined
        : await this.validRequirementIds(target.id, dto.requirementIds);

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: {
          title: dto.title?.trim(),
          description:
            dto.description === undefined ? undefined : dto.description?.trim() || null,
          assigneeId: dto.assigneeId,
          dueAt:
            dto.dueAt === undefined ? undefined : dto.dueAt ? new Date(dto.dueAt) : null,
          status: dto.status,
        },
      });

      if (requirementIds) {
        await tx.taskRequirement.deleteMany({ where: { taskId } });
        if (requirementIds.length) {
          await tx.taskRequirement.createMany({
            data: requirementIds.map((requirementId) => ({ taskId, requirementId })),
          });
        }
      }
    });

    return { id: taskId };
  }

  async remove(userId: string, taskId: string) {
    const { target, role } = await this.access.forTask(userId, taskId);
    this.access.assertManage(role);
    this.access.assertWritable(target);

    await this.prisma.task.delete({ where: { id: taskId } });
    return { ok: true };
  }

  private async assertAssignee(groupId: string, assigneeId: string | null | undefined) {
    if (!assigneeId) return;
    const member = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: assigneeId } },
    });
    if (!member) {
      throw new ValidationFailed('Người phụ trách phải là thành viên của nhóm.');
    }
  }

  private async validRequirementIds(targetId: string, ids: string[] | undefined) {
    const unique = [...new Set(ids ?? [])];
    if (unique.length === 0) return unique;

    const found = await this.prisma.requirement.count({
      where: { id: { in: unique }, targetId },
    });
    if (found !== unique.length) {
      throw new ValidationFailed(
        'Requirement phải thuộc cùng Submission Target với Task.',
      );
    }
    return unique;
  }
}
