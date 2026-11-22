import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { PaperListItem } from '../../api/types';
import { useAuth } from '../../components/Auth';
import { Async, Badge, Button, Card, EmptyState, Icon, PageHeader } from '../../components/ui';
import { daysFromNow, deadlineKindLabel, deadlineTone, relativeDays, targetName } from '../../lib/format';
import { useDebounced } from '../../lib/useDebounced';
import { useResource } from '../../lib/useResource';
import { PaperFormModal } from './PaperFormModal';

export function PapersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [creating, setCreating] = useState(false);

  const papers = useResource<PaperListItem[]>(`/papers${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`, {
    keepPrevious: true,
  });

  const canCreate = user.memberships.some((m) => m.role === 'MAIN_AUTHOR');

  return (
    <>
      <PageHeader
        eyebrow="Bài báo"
        title="Bài báo đang chuẩn bị"
        description="Mỗi bài báo (Paper) có một Submission Target đang hoạt động; các mục tiêu cũ được lưu trữ để tra cứu."
        actions={
          canCreate && (
            <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
              Tạo bài báo
            </Button>
          )
        }
      />

      <div className="filter-bar">
        <input
          className="input"
          type="search"
          placeholder="Tìm theo tiêu đề hoặc lĩnh vực…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 280 }}
          aria-label="Tìm bài báo"
        />
      </div>

      <Async state={papers}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon="book-open-page-variant-outline"
              action={
                canCreate && !q ? (
                  <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
                    + Tạo bài báo đầu tiên
                  </Button>
                ) : undefined
              }
            >
              {q
                ? 'Không có bài báo nào khớp từ khóa.'
                : canCreate
                  ? 'Chưa có bài báo nào. Hãy tạo hồ sơ Paper rồi thêm Submission Target cho hội nghị bạn nhắm tới.'
                  : 'Chưa có bài báo nào trong các nhóm của bạn.'}
            </EmptyState>
          ) : (
            <div className="list">
              {items.map((p) => {
                const target = p.activeTarget;
                const r = target?.readiness;
                const next = r?.nextDeadline;
                const days = next ? daysFromNow(next.at) : null;

                return (
                  <Link key={p.id} to={`/papers/${p.id}`} className="card-link">
                    <Card hover>
                      <div className="list-row" style={{ alignItems: 'flex-start' }}>
                        <div className="row-main">
                          <span className="eyebrow">
                            {p.group.name}
                            {p.researchArea ? ` · ${p.researchArea}` : ''}
                          </span>
                          <span className="row-title" style={{ fontSize: 16, marginTop: 2 }}>
                            {p.title}
                          </span>
                          <span className="row-sub">
                            {p.authors.length ? p.authors.join(', ') : 'Chưa có danh sách tác giả'}
                          </span>

                          {target ? (
                            <div className="row" style={{ marginTop: 10 }}>
                              <Badge tone="healthy" icon="target">
                                {targetName(target)}
                              </Badge>
                              {r && r.mandatoryOutstanding > 0 && (
                                <Badge tone="low">{r.mandatoryOutstanding} yêu cầu bắt buộc còn mở</Badge>
                              )}
                              {r && r.pendingVerification > 0 && <Badge tone="info">{r.pendingVerification} chờ xác minh</Badge>}
                              {r && r.overdueTasks > 0 && <Badge tone="critical">{r.overdueTasks} Task quá hạn</Badge>}
                              {r && r.blockedTasks > 0 && <Badge tone="critical">{r.blockedTasks} Task bị chặn</Badge>}
                            </div>
                          ) : (
                            <div className="row" style={{ marginTop: 10 }}>
                              <Badge tone="watch" icon="alert-outline">
                                Chưa có Submission Target đang hoạt động
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="row-side" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                          {next && days !== null ? (
                            <>
                              <span className="small muted">{deadlineKindLabel[next.kind] ?? next.kind}</span>
                              <Badge tone={deadlineTone(days)}>
                                <Icon name="clock-outline" size={12} /> {relativeDays(days)}
                              </Badge>
                            </>
                          ) : (
                            <span className="small muted">Chưa có deadline</span>
                          )}
                          <span className="small muted">{p.targetCount} Target</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )
        }
      </Async>

      <PaperFormModal open={creating} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/papers/${id}`)} />
    </>
  );
}
