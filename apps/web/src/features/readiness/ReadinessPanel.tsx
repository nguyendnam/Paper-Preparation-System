import type { ReactNode } from 'react';

import type { ReadinessRequirementRef, ReadinessView, RequirementStatus } from '../../api/types';
import {
  Badge,
  Card,
  EmptyState,
  Icon,
  RequirementStatusBadge,
  RequirementTypeBadge,
  TaskStatusBadge,
} from '../../components/ui';
import {
  daysFromNow,
  deadlineKindLabel,
  deadlineTone,
  formatDateTime,
  formatDate,
  relativeDays,
} from '../../lib/format';

function RequirementList({
  items,
  onOpen,
}: {
  items: ReadinessRequirementRef[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="list">
      {items.map((r) => (
        <button
          key={r.id}
          type="button"
          className="card card--sm list-row clickable"
          style={{ textAlign: 'left', font: 'inherit', width: '100%' }}
          onClick={() => onOpen(r.id)}
        >
          <span className="row-main">
            <span className="row-title">{r.description}</span>
          </span>
          <span className="row-side">
            <RequirementTypeBadge type={r.type} />
            <RequirementStatusBadge status={r.status} />
          </span>
        </button>
      ))}
    </div>
  );
}

function AttentionBlock({
  icon,
  title,
  hint,
  count,
  children,
}: {
  icon: string;
  title: string;
  hint: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <Card>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div className="row">
          <Icon name={icon} size={20} />
          <h3 className="card-title" style={{ margin: 0 }}>
            {title}
          </h3>
          <Badge>{count}</Badge>
        </div>
      </div>
      <p className="small muted" style={{ marginBottom: 12, lineHeight: 1.5 }}>
        {hint}
      </p>
      {children}
    </Card>
  );
}

export function ReadinessPanel({
  view,
  timezone,
  onOpenRequirement,
  onFilterStatus,
}: {
  view: ReadinessView;
  timezone: string;
  onOpenRequirement: (id: string) => void;
  onFilterStatus: (status: RequirementStatus | '') => void;
}) {
  const { requirements, tasks, deadlines } = view;
  const counts = requirements.counts;

  const pendingList = requirements.open.filter((r) => r.status === 'PENDING_VERIFICATION');
  const notReviewedList = requirements.open.filter((r) => r.status === 'NOT_REVIEWED');
  const needsActionList = requirements.open.filter((r) => r.status === 'NEEDS_ACTION');

  const nothingOutstanding =
    requirements.open.length === 0 &&
    requirements.missingEvidence.length === 0 &&
    tasks.overdue.length === 0 &&
    tasks.blocked === 0;

  return (
    <div className="stack">
      <div className="callout info">
        <strong>Readiness View không chấm điểm.</strong> Đây là góc nhìn tổng hợp từ trạng thái Requirement, Task, Evidence và
        Verification hiện có. Task hoàn thành không đồng nghĩa Requirement đã được đáp ứng; nhóm tự quyết định thời điểm nộp bài
        trên nền tảng chính thức của hội nghị.
      </div>

      <section>
        <div className="section-header-row">
          <h2 className="section-title">Mốc thời gian</h2>
        </div>
        {deadlines.upcoming.length ? (
          <div className="deadline-grid">
            {deadlines.upcoming.map((d) => {
              const days = daysFromNow(d.at);
              const isNext = deadlines.next?.kind === d.kind;
              return (
                <div key={d.kind} className={`deadline-item ${isNext ? 'next' : ''} ${days < 0 ? 'passed' : ''}`}>
                  <div className="deadline-kind">{deadlineKindLabel[d.kind] ?? d.kind}</div>
                  <div className="deadline-date">{formatDateTime(d.at, timezone)}</div>
                  <div style={{ marginTop: 6 }}>
                    <Badge tone={deadlineTone(days)}>{relativeDays(days)}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="calendar-blank-outline">
            Chưa ghi nhận deadline cho Target này. Hãy cập nhật theo nguồn chính thức của hội nghị.
          </EmptyState>
        )}
      </section>

      <section>
        <div className="section-header-row">
          <h2 className="section-title">Trạng thái Requirement</h2>
          <span className="small muted">Bấm vào một ô để lọc danh sách yêu cầu</span>
        </div>
        <div className="status-strip">
          <button type="button" className="status-cell healthy" onClick={() => onFilterStatus('VERIFIED')}>
            <strong>{counts.verified}</strong>
            <span>Đã xác nhận đáp ứng</span>
          </button>
          <button type="button" className="status-cell info" onClick={() => onFilterStatus('PENDING_VERIFICATION')}>
            <strong>{counts.pendingVerification}</strong>
            <span>Chờ xác minh</span>
          </button>
          <button type="button" className="status-cell critical" onClick={() => onFilterStatus('NEEDS_ACTION')}>
            <strong>{counts.needsAction}</strong>
            <span>Cần xử lý</span>
          </button>
          <button type="button" className="status-cell watch" onClick={() => onFilterStatus('NOT_REVIEWED')}>
            <strong>{counts.notReviewed}</strong>
            <span>Chưa rà soát</span>
          </button>
          <button type="button" className="status-cell" onClick={() => onFilterStatus('NOT_APPLICABLE')}>
            <strong>{counts.notApplicable}</strong>
            <span>Không áp dụng</span>
          </button>
        </div>
      </section>

      <section>
        <div className="section-header-row">
          <h2 className="section-title">Tiến độ Task</h2>
          <span className="small muted">Phản ánh việc cần làm, không phải kết quả đáp ứng yêu cầu</span>
        </div>
        <div className="status-strip">
          <div className="status-cell">
            <strong>{tasks.todo}</strong>
            <span>Chưa bắt đầu</span>
          </div>
          <div className="status-cell info">
            <strong>{tasks.inProgress}</strong>
            <span>Đang thực hiện</span>
          </div>
          <div className="status-cell critical">
            <strong>{tasks.blocked}</strong>
            <span>Đang bị chặn</span>
          </div>
          <div className="status-cell healthy">
            <strong>{tasks.done}</strong>
            <span>Hoàn thành</span>
          </div>
          <div className="status-cell critical">
            <strong>{tasks.overdue.length}</strong>
            <span>Quá hạn</span>
          </div>
        </div>
      </section>

      <section className="stack">
        <div className="section-header-row" style={{ marginBottom: 0 }}>
          <h2 className="section-title">Nội dung còn tồn đọng</h2>
        </div>

        {nothingOutstanding && (
          <EmptyState icon="check-circle-outline">
            Hiện không có Requirement mở, Task quá hạn hoặc bị chặn. Hãy tự rà soát lại trước khi nộp bài.
          </EmptyState>
        )}

        {requirements.mandatoryOutstanding.length > 0 && (
          <div className="callout critical">
            <strong>{requirements.mandatoryOutstanding.length} Requirement bắt buộc</strong> chưa ở trạng thái “Đã xác nhận đáp ứng”
            hoặc “Không áp dụng”. Các mục này được liệt kê trong các nhóm bên dưới theo trạng thái xử lý.
          </div>
        )}

        <AttentionBlock
          icon="paperclip"
          title="Thiếu Evidence"
          hint="Nhóm đã đánh dấu các yêu cầu này cần lưu căn cứ nhưng chưa có Evidence nào."
          count={requirements.missingEvidence.length}
        >
          <RequirementList items={requirements.missingEvidence} onOpen={onOpenRequirement} />
        </AttentionBlock>

        <AttentionBlock
          icon="clipboard-check-outline"
          title="Chờ xác minh"
          hint="Đang chờ Verifier, Supervisor hoặc Main Author ghi nhận Verification."
          count={pendingList.length}
        >
          <RequirementList items={pendingList} onOpen={onOpenRequirement} />
        </AttentionBlock>

        <AttentionBlock
          icon="information-outline"
          title="Task đã xong nhưng Requirement chưa được xác nhận"
          hint="Mọi Task liên kết đã hoàn thành, nhưng hệ thống không tự suy ra yêu cầu đã đáp ứng. Hãy xem xét và xác nhận."
          count={requirements.tasksDoneAwaitingConfirmation.length}
        >
          <RequirementList items={requirements.tasksDoneAwaitingConfirmation} onOpen={onOpenRequirement} />
        </AttentionBlock>

        <AttentionBlock
          icon="alert-circle-outline"
          title="Cần xử lý"
          hint="Verification không đạt hoặc nhóm đã đánh dấu cần xử lý."
          count={needsActionList.length}
        >
          <RequirementList items={needsActionList} onOpen={onOpenRequirement} />
        </AttentionBlock>

        <AttentionBlock
          icon="eye-outline"
          title="Chưa rà soát"
          hint="Chưa được xem xét; không mặc định là đã đáp ứng."
          count={notReviewedList.length}
        >
          <RequirementList items={notReviewedList} onOpen={onOpenRequirement} />
        </AttentionBlock>

        <AttentionBlock
          icon="clock-alert-outline"
          title="Task quá hạn"
          hint="Task chưa hoàn thành nhưng đã qua deadline."
          count={tasks.overdue.length}
        >
          <div className="list">
            {tasks.overdue.map((t) => (
              <Card key={t.id} size="sm" className="list-row">
                <div className="row-main">
                  <span className="row-title">{t.title}</span>
                  <span className="row-sub">
                    {t.assigneeName ?? 'Chưa phân công'} · hạn {formatDate(t.dueAt)}
                  </span>
                </div>
                <div className="row-side">
                  <TaskStatusBadge status={t.status} />
                </div>
              </Card>
            ))}
          </div>
        </AttentionBlock>
      </section>
    </div>
  );
}
