import type { RequirementStatus, TaskStatus } from './readiness';

export type VerificationResult = 'PASSED' | 'FAILED' | 'NEEDS_REVISION';

/**
 * A recorded Verification moves the Requirement status:
 * PASSED -> VERIFIED, otherwise the requirement needs more work (FR-30).
 */
export function requirementStatusAfterVerification(
  result: VerificationResult,
): RequirementStatus {
  return result === 'PASSED' ? 'VERIFIED' : 'NEEDS_ACTION';
}

export type GroupRole =
  | 'MAIN_AUTHOR'
  | 'CO_AUTHOR'
  | 'VERIFIER'
  | 'SUPERVISOR';

/** Roles that may record a Verification or confirm a Requirement as VERIFIED (BR-08). */
export const CONFIRMING_ROLES: GroupRole[] = [
  'MAIN_AUTHOR',
  'VERIFIER',
  'SUPERVISOR',
];

export function canConfirmRequirement(role: GroupRole): boolean {
  return CONFIRMING_ROLES.includes(role);
}

/** Roles that manage Paper, Target, Requirement and Task definitions. */
export function canManageTarget(role: GroupRole): boolean {
  return role === 'MAIN_AUTHOR';
}

/** Roles that may add Evidence (BR-07). */
export function canAddEvidence(role: GroupRole): boolean {
  return role === 'MAIN_AUTHOR' || role === 'CO_AUTHOR';
}

export interface RequirementCopySource {
  id: string;
  description: string;
  type: 'MANDATORY' | 'OPTIONAL' | 'RECOMMENDED';
  sourceType: 'CFP' | 'AUTHOR_GUIDELINES' | 'OTHER';
  sourceUrl: string | null;
  sourceSection: string | null;
  condition: string | null;
  needsEvidence: boolean;
}

export interface TaskCopySource {
  id: string;
  title: string;
  description: string | null;
}

/**
 * BR-12: a copied requirement is a brand-new record that must be reviewed again
 * against the sources of the new target. The old source URL is dropped because
 * it referred to the previous conference.
 */
export function buildRequirementCopy(source: RequirementCopySource) {
  return {
    description: source.description,
    type: source.type,
    sourceType: source.sourceType,
    sourceUrl: null as string | null,
    sourceSection: null as string | null,
    condition: source.condition,
    needsEvidence: source.needsEvidence,
    status: 'NOT_REVIEWED' as RequirementStatus,
    copiedFromId: source.id,
  };
}

/**
 * BR-13: a copied task starts from TODO; assignee and deadline must be set again.
 */
export function buildTaskCopy(source: TaskCopySource) {
  return {
    title: source.title,
    description: source.description,
    status: 'TODO' as TaskStatus,
    assigneeId: null as string | null,
    dueAt: null as Date | null,
    copiedFromId: source.id,
  };
}
