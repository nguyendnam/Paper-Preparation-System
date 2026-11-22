import { Injectable, Module } from '@nestjs/common';
import {
  summarizeReadiness,
  type ReadinessSummary,
  type RequirementInput,
  type TaskInput,
} from '@paper/domain';

import { PrismaService } from '../prisma/prisma.service';

export interface TargetDeadlines {
  id: string;
  abstractDeadline: Date | null;
  fullPaperDeadline: Date | null;
  notificationDate: Date | null;
}

export interface CompactReadiness {
  requirementsTotal: number;
  verified: number;
  notReviewed: number;
  needsAction: number;
  pendingVerification: number;
  notApplicable: number;
  mandatoryOutstanding: number;
  missingEvidence: number;
  tasksTotal: number;
  tasksDone: number;
  blockedTasks: number;
  overdueTasks: number;
  nextDeadline: { kind: string; at: Date; daysRemaining: number } | null;
}

export function compactReadiness(s: ReadinessSummary): CompactReadiness {
  return {
    requirementsTotal: s.requirements.total,
    verified: s.requirements.verified,
    notReviewed: s.requirements.notReviewed,
    needsAction: s.requirements.needsAction,
    pendingVerification: s.requirements.pendingVerification,
    notApplicable: s.requirements.notApplicable,
    mandatoryOutstanding: s.requirements.mandatoryOutstanding.length,
    missingEvidence: s.requirements.missingEvidence.length,
    tasksTotal: s.tasks.total,
    tasksDone: s.tasks.done,
    blockedTasks: s.tasks.blocked,
    overdueTasks: s.tasks.overdue.length,
    nextDeadline: s.deadlines.next,
  };
}

/**
 * Builds the Readiness View (FR-32..FR-38). It only gathers data and delegates
 * all rules to @paper/domain; there is intentionally no score (BR-09).
 */
@Injectable()
export class ReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async forTargets(
    targets: TargetDeadlines[],
  ): Promise<Map<string, ReadinessSummary>> {
    const ids = targets.map((t) => t.id);
    const result = new Map<string, ReadinessSummary>();
    if (ids.length === 0) return result;

    const [requirements, tasks] = await Promise.all([
      this.prisma.requirement.findMany({
        where: { targetId: { in: ids } },
        select: {
          id: true,
          targetId: true,
          description: true,
          type: true,
          status: true,
          needsEvidence: true,
          _count: { select: { evidence: true } },
          taskLinks: { select: { taskId: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.task.findMany({
        where: { targetId: { in: ids } },
        select: {
          id: true,
          targetId: true,
          title: true,
          status: true,
          dueAt: true,
          assigneeId: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const now = new Date();

    for (const target of targets) {
      const reqInputs: RequirementInput[] = requirements
        .filter((r) => r.targetId === target.id)
        .map((r) => ({
          id: r.id,
          description: r.description,
          type: r.type,
          status: r.status,
          needsEvidence: r.needsEvidence,
          evidenceCount: r._count.evidence,
          taskIds: r.taskLinks.map((l) => l.taskId),
        }));

      const taskInputs: TaskInput[] = tasks
        .filter((t) => t.targetId === target.id)
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          dueAt: t.dueAt,
          assigneeId: t.assigneeId,
        }));

      result.set(
        target.id,
        summarizeReadiness({
          requirements: reqInputs,
          tasks: taskInputs,
          deadlines: {
            abstractDeadline: target.abstractDeadline,
            fullPaperDeadline: target.fullPaperDeadline,
            notificationDate: target.notificationDate,
          },
          now,
        }),
      );
    }

    return result;
  }

  async forTarget(target: TargetDeadlines): Promise<ReadinessSummary> {
    const map = await this.forTargets([target]);
    return map.get(target.id) as ReadinessSummary;
  }
}

@Module({
  providers: [ReadinessService],
  exports: [ReadinessService],
})
export class ReadinessModule {}
