export type GroupRole = 'MAIN_AUTHOR' | 'CO_AUTHOR' | 'VERIFIER' | 'SUPERVISOR';
export type TargetStatus = 'ACTIVE' | 'ARCHIVED';
export type RequirementType = 'MANDATORY' | 'OPTIONAL' | 'RECOMMENDED';
export type RequirementStatus =
  | 'NOT_REVIEWED'
  | 'NEEDS_ACTION'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'NOT_APPLICABLE';
export type RequirementSourceType = 'CFP' | 'AUTHOR_GUIDELINES' | 'OTHER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
export type EvidenceType = 'NOTE' | 'URL' | 'FILE' | 'VERSION_REFERENCE';
export type VerificationResult = 'PASSED' | 'FAILED' | 'NEEDS_REVISION';

export interface Me {
  id: string;
  email: string;
  displayName: string;
  memberships: { groupId: string; groupName: string; role: GroupRole }[];
}

export interface Permissions {
  role: GroupRole;
  canManage: boolean;
  canConfirm: boolean;
  canAddEvidence: boolean;
  writable?: boolean;
  canEdit?: boolean;
}

export interface Group {
  id: string;
  name: string;
  paperCount: number;
  myRole: GroupRole;
  members: {
    userId: string;
    email: string;
    displayName: string;
    role: GroupRole;
    joinedAt: string;
  }[];
}

export interface NextDeadline {
  kind: string;
  at: string;
  daysRemaining: number;
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
  nextDeadline: NextDeadline | null;
}

export interface TargetSummary {
  id: string;
  conferenceName: string;
  acronym: string | null;
  conferenceYear: number | null;
  track: string | null;
  status: TargetStatus;
  abstractDeadline: string | null;
  fullPaperDeadline: string | null;
  notificationDate: string | null;
  archivedAt: string | null;
  readiness?: CompactReadiness | null;
}

export interface PaperListItem {
  id: string;
  title: string;
  researchArea: string | null;
  group: { id: string; name: string };
  authors: string[];
  targetCount: number;
  activeTarget: TargetSummary | null;
  updatedAt: string;
}

export interface PaperAuthor {
  id?: string;
  fullName: string;
  email: string | null;
  affiliation: string | null;
  position?: number;
  isCorresponding: boolean;
}

export interface PaperDetail {
  id: string;
  groupId: string;
  title: string;
  abstract: string | null;
  researchArea: string | null;
  manuscriptUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  group: { id: string; name: string };
  createdBy: { id: string; displayName: string };
  authors: PaperAuthor[];
  targets: (TargetSummary & {
    edition: string | null;
    timezone: string;
    archiveReason: string | null;
    _count: { requirements: number; tasks: number };
  })[];
  permissions: Permissions;
}

export interface TargetDetail {
  id: string;
  paperId: string;
  conferenceName: string;
  acronym: string | null;
  edition: string | null;
  conferenceYear: number | null;
  track: string | null;
  cfpUrl: string | null;
  authorGuidelinesUrl: string | null;
  timezone: string;
  abstractDeadline: string | null;
  fullPaperDeadline: string | null;
  notificationDate: string | null;
  deadlineSource: string | null;
  status: TargetStatus;
  archiveReason: string | null;
  archivedAt: string | null;
  archivedByName: string | null;
  createdAt: string;
  paper: { id: string; title: string; manuscriptUrl: string | null };
  group: { id: string; name: string };
  previousTarget: { id: string; conferenceName: string; acronym: string | null; conferenceYear: number | null } | null;
  nextTarget: { id: string; conferenceName: string; acronym: string | null; conferenceYear: number | null } | null;
  counts: { requirements: number; tasks: number };
  permissions: Permissions;
}

export interface TargetHistoryItem {
  id: string;
  status: TargetStatus;
  conferenceName: string;
  acronym: string | null;
  edition: string | null;
  conferenceYear: number | null;
  track: string | null;
  fullPaperDeadline: string | null;
  archivedAt: string | null;
  archiveReason: string | null;
  archivedByName: string | null;
  createdAt: string;
  paper: { id: string; title: string; groupName: string };
  requirementCount: number;
  taskCount: number;
}

export interface ReadinessRequirementRef {
  id: string;
  description: string;
  type: RequirementType;
  status: RequirementStatus;
}

export interface ReadinessView {
  compact: CompactReadiness;
  requirements: {
    counts: {
      total: number;
      verified: number;
      notReviewed: number;
      needsAction: number;
      pendingVerification: number;
      notApplicable: number;
    };
    mandatoryOutstanding: ReadinessRequirementRef[];
    missingEvidence: ReadinessRequirementRef[];
    tasksDoneAwaitingConfirmation: ReadinessRequirementRef[];
    open: ReadinessRequirementRef[];
  };
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    blocked: number;
    overdue: {
      id: string;
      title: string;
      dueAt: string | null;
      status: TaskStatus;
      assigneeName: string | null;
    }[];
  };
  deadlines: {
    upcoming: NextDeadline[];
    next: NextDeadline | null;
  };
  generatedAt: string;
}

export interface TaskRef {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface RequirementItem {
  id: string;
  description: string;
  type: RequirementType;
  status: RequirementStatus;
  sourceType: RequirementSourceType;
  sourceUrl: string | null;
  sourceSection: string | null;
  condition: string | null;
  needsEvidence: boolean;
  copiedFromId: string | null;
  evidenceCount: number;
  verificationCount: number;
  latestVerification: { result: VerificationResult; verifiedAt: string } | null;
  tasks: TaskRef[];
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  description: string;
  sourceUrl: string | null;
  fileName: string | null;
  filePath: string | null;
  versionReference: string | null;
  createdAt: string;
  createdBy: { id: string; displayName: string };
}

export interface VerificationItem {
  id: string;
  result: VerificationResult;
  note: string | null;
  verifiedAt: string;
  verifier: { id: string; displayName: string };
  evidence: { id: string; description: string; type: EvidenceType } | null;
}

export interface RequirementDetail {
  id: string;
  description: string;
  type: RequirementType;
  status: RequirementStatus;
  sourceType: RequirementSourceType;
  sourceUrl: string | null;
  sourceSection: string | null;
  condition: string | null;
  needsEvidence: boolean;
  tasks: {
    id: string;
    title: string;
    status: TaskStatus;
    dueAt: string | null;
    assignee: { id: string; displayName: string } | null;
  }[];
  evidence: EvidenceItem[];
  verifications: VerificationItem[];
  target: { id: string; conferenceName: string; acronym: string | null; status: TargetStatus };
  paper: { id: string; title: string };
  permissions: Permissions;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: string | null;
  assigneeId: string | null;
  assignee: { id: string; displayName: string; email: string } | null;
  requirements: ReadinessRequirementRef[];
}

export interface TaskList {
  permissions: Permissions;
  items: TaskItem[];
}

export interface MyTaskItem extends TaskItem {
  target: {
    id: string;
    conferenceName: string;
    acronym: string | null;
    paper: { id: string; title: string };
  };
}

export interface DashboardData {
  totals: {
    groups: number;
    papers: number;
    activeTargets: number;
    openMyTasks: number;
    mandatoryOutstanding: number;
    pendingVerification: number;
    overdueTasks: number;
  };
  activeTargets: {
    id: string;
    conferenceName: string;
    acronym: string | null;
    conferenceYear: number | null;
    track: string | null;
    timezone: string;
    abstractDeadline: string | null;
    fullPaperDeadline: string | null;
    notificationDate: string | null;
    paper: { id: string; title: string };
    readiness: CompactReadiness;
  }[];
  myTasks: (MyTaskItem & { overdue: boolean })[];
  pendingVerification: {
    id: string;
    description: string;
    type: RequirementType;
    target: {
      id: string;
      conferenceName: string;
      acronym: string | null;
      paper: { id: string; title: string };
    };
  }[];
}
