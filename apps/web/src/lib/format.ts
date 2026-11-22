import type {
  EvidenceType,
  GroupRole,
  RequirementSourceType,
  RequirementStatus,
  RequirementType,
  TaskStatus,
  VerificationResult,
} from '../api/types';

export type Tone = 'neutral' | 'healthy' | 'watch' | 'low' | 'critical' | 'info' | 'brand';

/* ---------- Labels (Vietnamese UI, English domain terms kept as in the thesis) ---------- */

export const roleLabel: Record<GroupRole, string> = {
  MAIN_AUTHOR: 'Main Author',
  CO_AUTHOR: 'Co-author',
  VERIFIER: 'Verifier',
  SUPERVISOR: 'Supervisor',
};

export const roleHint: Record<GroupRole, string> = {
  MAIN_AUTHOR: 'Quản lý Paper, Target, Requirement, Task và chuyển Target',
  CO_AUTHOR: 'Cập nhật Task được giao và cung cấp Evidence',
  VERIFIER: 'Kiểm tra Requirement/Evidence và ghi Verification',
  SUPERVISOR: 'Hỗ trợ chuyên môn, có thể xác minh khi được giao',
};

export const requirementStatusLabel: Record<RequirementStatus, string> = {
  NOT_REVIEWED: 'Chưa rà soát',
  NEEDS_ACTION: 'Cần xử lý',
  PENDING_VERIFICATION: 'Chờ xác minh',
  VERIFIED: 'Đã xác nhận đáp ứng',
  NOT_APPLICABLE: 'Không áp dụng',
};

export const requirementStatusTone: Record<RequirementStatus, Tone> = {
  NOT_REVIEWED: 'neutral',
  NEEDS_ACTION: 'critical',
  PENDING_VERIFICATION: 'info',
  VERIFIED: 'healthy',
  NOT_APPLICABLE: 'neutral',
};

export const requirementTypeLabel: Record<RequirementType, string> = {
  MANDATORY: 'Bắt buộc',
  OPTIONAL: 'Tùy chọn',
  RECOMMENDED: 'Khuyến nghị',
};

export const requirementTypeTone: Record<RequirementType, Tone> = {
  MANDATORY: 'low',
  OPTIONAL: 'neutral',
  RECOMMENDED: 'brand',
};

export const sourceTypeLabel: Record<RequirementSourceType, string> = {
  CFP: 'CFP',
  AUTHOR_GUIDELINES: 'Author Guidelines',
  OTHER: 'Nguồn khác',
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  TODO: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang thực hiện',
  BLOCKED: 'Đang bị chặn',
  DONE: 'Hoàn thành',
};

export const taskStatusTone: Record<TaskStatus, Tone> = {
  TODO: 'neutral',
  IN_PROGRESS: 'info',
  BLOCKED: 'critical',
  DONE: 'healthy',
};

export const evidenceTypeLabel: Record<EvidenceType, string> = {
  NOTE: 'Ghi chú',
  URL: 'Đường dẫn',
  FILE: 'Tệp',
  VERSION_REFERENCE: 'Tham chiếu phiên bản',
};

export const verificationLabel: Record<VerificationResult, string> = {
  PASSED: 'Đạt',
  FAILED: 'Không đạt',
  NEEDS_REVISION: 'Cần chỉnh sửa',
};

export const verificationTone: Record<VerificationResult, Tone> = {
  PASSED: 'healthy',
  FAILED: 'critical',
  NEEDS_REVISION: 'watch',
};

export const deadlineKindLabel: Record<string, string> = {
  ABSTRACT: 'Abstract',
  FULL_PAPER: 'Full paper',
  NOTIFICATION: 'Thông báo kết quả',
};

/* ---------- Time zones (NFR-08) ---------- */

export const timezoneOptions: { value: string; label: string }[] = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Etc/GMT+12', label: 'AoE – Anywhere on Earth (UTC−12)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (UTC+7)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris / Central Europe' },
  { value: 'America/New_York', label: 'New York (Eastern)' },
  { value: 'America/Chicago', label: 'Chicago (Central)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (Pacific)' },
];

export function timezoneLabel(tz: string): string {
  return timezoneOptions.find((o) => o.value === tz)?.label ?? tz;
}

function offsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** "2027-01-10T23:59" typed in `timeZone` → ISO instant. */
export function zonedLocalToIso(local: string, timeZone: string): string | null {
  if (!local) return null;
  const [datePart, timePart = '00:00'] = local.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let result = guess - offsetMs(guess, timeZone);
  result = guess - offsetMs(result, timeZone);
  return new Date(result).toISOString();
}

/** ISO instant → "YYYY-MM-DDTHH:mm" as seen in `timeZone`, for <input type="datetime-local">. */
export function isoToZonedLocal(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return '';
  const instant = new Date(iso).getTime();
  const shifted = new Date(instant + offsetMs(instant, timeZone));
  return shifted.toISOString().slice(0, 16);
}

/* ---------- Dates ---------- */

export function formatDateTime(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return 'Chưa đặt';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Chưa đặt';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(iso));
}

export function daysFromNow(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export function relativeDays(days: number): string {
  if (days === 0) return 'Hôm nay';
  if (days > 0) return `Còn ${days} ngày`;
  return `Quá hạn ${Math.abs(days)} ngày`;
}

export function deadlineTone(days: number): Tone {
  if (days < 0) return 'neutral';
  if (days <= 3) return 'critical';
  if (days <= 7) return 'low';
  if (days <= 14) return 'watch';
  return 'healthy';
}

export function targetName(t: { conferenceName: string; acronym: string | null; conferenceYear?: number | null }): string {
  const base = t.acronym || t.conferenceName;
  return t.conferenceYear ? `${base} ${t.conferenceYear}` : base;
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}
