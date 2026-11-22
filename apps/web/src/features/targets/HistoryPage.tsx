import { Link } from 'react-router-dom';

import type { TargetHistoryItem } from '../../api/types';
import { Async, Card, EmptyState, Icon, PageHeader, TargetStatusBadge } from '../../components/ui';
import { formatDateTime, targetName } from '../../lib/format';
import { useResource } from '../../lib/useResource';

export function HistoryPage() {
  const archived = useResource<TargetHistoryItem[]>('/targets?status=ARCHIVED');

  return (
    <>
      <PageHeader
        eyebrow="Lịch sử"
        title="Lịch sử mục tiêu"
        description="Các Submission Target đã được lưu trữ. Dữ liệu được bảo toàn nguyên vẹn để tra cứu và không thể chỉnh sửa."
      />

      <Async state={archived}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState icon="history">
              Chưa có Target nào được lưu trữ. Khi nhóm đổi hội nghị mục tiêu, Target cũ sẽ xuất hiện ở đây.
            </EmptyState>
          ) : (
            <div className="list">
              {items.map((t) => (
                <Link key={t.id} to={`/targets/${t.id}`} className="card-link">
                  <Card hover>
                    <div className="list-row" style={{ alignItems: 'flex-start' }}>
                      <div className="row-main">
                        <span className="eyebrow">{t.paper.groupName}</span>
                        <span className="row-title" style={{ fontSize: 16, marginTop: 2 }}>
                          {targetName(t)} — {t.paper.title}
                        </span>
                        <span className="row-sub">
                          {t.conferenceName}
                          {t.track ? ` · ${t.track}` : ''}
                        </span>
                        <span className="row-sub">
                          <Icon name="archive-outline" size={12} /> Lưu trữ {formatDateTime(t.archivedAt)}
                          {t.archivedByName ? ` bởi ${t.archivedByName}` : ''}
                          {t.archiveReason ? ` — ${t.archiveReason}` : ''}
                        </span>
                      </div>
                      <div className="row-side" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                        <TargetStatusBadge status={t.status} />
                        <span className="small muted">
                          {t.requirementCount} Requirement · {t.taskCount} Task
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )
        }
      </Async>
    </>
  );
}
