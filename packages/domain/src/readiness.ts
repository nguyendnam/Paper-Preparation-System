export type RequirementStatus =
  | 'NOT_REVIEWED'
  | 'NEEDS_ACTION'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'NOT_APPLICABLE';

export type RequirementType =
  | 'MANDATORY'
  | 'OPTIONAL'
  | 'RECOMMENDED';

export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'DONE';

export interface RequirementInput {
  id: string;
  description: string;
  type: RequirementType;
  status: RequirementStatus;
  /** BR-17: the group decided this requirement needs a recorded evidence. */
  needsEvidence?: boolean;
  evidenceCount?: number;
  /** Ids of the tasks linked to this requirement (FR-14 / FR-21). */
  taskIds?: string[];
}

export interface TaskInput {
  id: string;
  title: string;
  status: TaskStatus;
  dueAt: Date | null;
  assigneeId?: string | null;
}

export interface DeadlineInput {
  abstractDeadline?: Date | null;
  fullPaperDeadline?: Date | null;
  notificationDate?: Date | null;
}

export interface ReadinessInput {
  requirements: RequirementInput[];
  tasks: TaskInput[];
  deadlines?: DeadlineInput;
  now?: Date;
}

export interface UpcomingDeadline {
  kind: 'ABSTRACT' | 'FULL_PAPER' | 'NOTIFICATION';
  at: Date;
  /** Whole days from `now` (negative when the deadline has passed). */
  daysRemaining: number;
}

const CLOSED_REQUIREMENT: RequirementStatus[] = ['VERIFIED', 'NOT_APPLICABLE'];

export function isRequirementClosed(status: RequirementStatus): boolean {
  return CLOSED_REQUIREMENT.includes(status);
}

const DAY_MS = 86_400_000;

export function daysUntil(target: Date, now: Date): number {
  return Math.ceil((target.getTime() - now.getTime()) / DAY_MS);
}

/**
 * Readiness View (FR-32..FR-38, BR-09).
 *
 * It only aggregates statuses that already exist. It never produces a score or
 * percentage and it never derives "Requirement verified" from "Task done" (BR-06).
 */
export function summarizeReadiness(input: ReadinessInput) {
  const { requirements, tasks } = input;
  const now = input.now ?? new Date();

  const open = requirements.filter((r) => !isRequirementClosed(r.status));

  const mandatoryOutstanding = requirements.filter(
    (requirement) =>
      requirement.type === 'MANDATORY' &&
      !isRequirementClosed(requirement.status),
  );

  const overdueTasks = tasks.filter(
    (task) =>
      task.dueAt !== null &&
      task.dueAt.getTime() < now.getTime() &&
      task.status !== 'DONE',
  );

  const missingEvidence = open.filter(
    (r) => r.needsEvidence === true && (r.evidenceCount ?? 0) === 0,
  );

  // Informational only: all linked tasks are DONE, yet the requirement is still not confirmed.
  const tasksDoneAwaitingConfirmation = open.filter((r) => {
    const ids = r.taskIds ?? [];
    if (ids.length === 0) return false;
    return ids.every((id) => tasks.find((t) => t.id === id)?.status === 'DONE');
  });

  const countByStatus = (status: RequirementStatus) =>
    requirements.filter((r) => r.status === status).length;

  const upcoming: UpcomingDeadline[] = [];
  const d = input.deadlines;
  if (d?.abstractDeadline) {
    upcoming.push({
      kind: 'ABSTRACT',
      at: d.abstractDeadline,
      daysRemaining: daysUntil(d.abstractDeadline, now),
    });
  }
  if (d?.fullPaperDeadline) {
    upcoming.push({
      kind: 'FULL_PAPER',
      at: d.fullPaperDeadline,
      daysRemaining: daysUntil(d.fullPaperDeadline, now),
    });
  }
  if (d?.notificationDate) {
    upcoming.push({
      kind: 'NOTIFICATION',
      at: d.notificationDate,
      daysRemaining: daysUntil(d.notificationDate, now),
    });
  }
  upcoming.sort((a, b) => a.at.getTime() - b.at.getTime());

  const nextDeadline =
    upcoming.find((u) => u.at.getTime() >= now.getTime()) ?? null;

  return {
    requirements: {
      total: requirements.length,
      verified: countByStatus('VERIFIED'),
      notReviewed: countByStatus('NOT_REVIEWED'),
      needsAction: countByStatus('NEEDS_ACTION'),
      pendingVerification: countByStatus('PENDING_VERIFICATION'),
      notApplicable: countByStatus('NOT_APPLICABLE'),
      mandatoryOutstanding,
      missingEvidence,
      tasksDoneAwaitingConfirmation,
    },

    tasks: {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'TODO').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      done: tasks.filter((t) => t.status === 'DONE').length,
      blocked: tasks.filter((t) => t.status === 'BLOCKED').length,
      overdue: overdueTasks,
    },

    deadlines: {
      upcoming,
      next: nextDeadline,
    },
  };
}

export type ReadinessSummary = ReturnType<typeof summarizeReadiness>;
