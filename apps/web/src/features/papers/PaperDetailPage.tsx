import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type { PaperDetail } from '../../api/types';
import { Async, Badge, Button, Card, EmptyState, Icon, PageHeader, TargetStatusBadge } from '../../components/ui';
import {
  daysFromNow,
  deadlineKindLabel,
  deadlineTone,
  formatDateTime,
  relativeDays,
  targetName,
} from '../../lib/format';
import { useResource } from '../../lib/useResource';
import { TargetFormModal } from '../targets/TargetFormModal';
import { PaperFormModal } from './PaperFormModal';

export function PaperDetailPage() {
  const { paperId = '' } = useParams();
  const navigate = useNavigate();
  const paper = useResource<PaperDetail>(`/papers/${paperId}`);
  const [editing, setEditing] = useState(false);
  const [creatingTarget, setCreatingTarget] = useState(false);

  return (
    <Async state={paper}>
      {(p) => {
        const canManage = p.permissions.canManage;
        const hasActive = p.targets.some((t) => t.status === 'ACTIVE');
        // Oldest first so the lineage reads left-to-right as a history.
        const lineage = [...p.targets].reverse();

        return (
          <>
            <PageHeader
              crumbs={[{ label: 'Bài báo', to: '/papers' }, { label: p.title }]}
              eyebrow={`${p.group.name}${p.researchArea ? ` · ${p.researchArea}` : ''}`}
              title={p.title}
              description={p.abstract ?? undefined}
              actions={
                canManage && (
                  <>
                    <Button icon="pencil-outline" onClick={() => setEditing(true)}>
                      Cập nhật
                    </Button>
                    {!hasActive && (
                      <Button variant="primary" icon="plus" onClick={() => setCreatingTarget(true)}>
                        Tạo Submission Target
                      </Button>
                    )}
                  </>
                )
              }
            />

            <div className="grid-2" style={{ alignItems: 'start' }}>
              <Card>
                <h2 className="card-title">Thông tin bài báo</h2>
                <dl className="kv">
                  <dt>Bản thảo</dt>
                  <dd>
                    {p.manuscriptUrl ? (
                      <a className="link" href={p.manuscriptUrl} target="_blank" rel="noreferrer noopener">
                        {p.manuscriptUrl}
                      </a>
                    ) : (
                      'Chưa có liên kết'
                    )}
                  </dd>
                  <dt>Lĩnh vực</dt>
                  <dd>{p.researchArea || 'Chưa xác định'}</dd>
                  <dt>Ghi chú</dt>
                  <dd>{p.notes || '—'}</dd>
                  <dt>Tạo bởi</dt>
                  <dd>
                    {p.createdBy.displayName} · {formatDateTime(p.createdAt)}
                  </dd>
                </dl>
              </Card>

              <Card>
                <h2 className="card-title">Tác giả ({p.authors.length})</h2>
                {p.authors.length === 0 ? (
                  <p className="small muted">Chưa có danh sách tác giả.</p>
                ) : (
                  <ol className="stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
                    {p.authors.map((a) => (
                      <li key={a.id}>
                        <strong>{a.fullName}</strong>
                        {a.isCorresponding && (
                          <>
                            {' '}
                            <Badge tone="brand">Liên hệ</Badge>
                          </>
                        )}
                        <div className="small muted">{[a.affiliation, a.email].filter(Boolean).join(' · ') || '—'}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>

            <section className="section">
              <div className="section-header-row">
                <h2 className="section-title">Submission Target ({p.targets.length})</h2>
                {canManage && !hasActive && (
                  <Button size="sm" icon="plus" onClick={() => setCreatingTarget(true)}>
                    Tạo Target
                  </Button>
                )}
              </div>

              {p.targets.length === 0 ? (
                <EmptyState
                  icon="target"
                  action={
                    canManage ? (
                      <Button variant="primary" size="sm" onClick={() => setCreatingTarget(true)}>
                        + Tạo Submission Target đầu tiên
                      </Button>
                    ) : undefined
                  }
                >
                  Bài báo chưa có mục tiêu nộp bài. Hãy tạo Submission Target cho hội nghị bạn nhắm tới để ghi nhận CFP, deadline và Requirement.
                </EmptyState>
              ) : (
                <>
                  {lineage.length > 1 && (
                    <div className="flow" style={{ marginBottom: 16 }} aria-label="Lịch sử mục tiêu của bài báo">
                      {lineage.map((t, index) => (
                        <div key={t.id} className="row" style={{ flex: 1, minWidth: 160, gap: 8, flexWrap: 'nowrap' }}>
                          {index > 0 && <Icon name="arrow-right" className="flow-arrow" />}
                          <Link to={`/targets/${t.id}`} className={`flow-step ${t.status === 'ACTIVE' ? 'current' : ''}`} style={{ flex: 1 }}>
                            <div className="small muted">Lần {index + 1}</div>
                            <strong>{targetName(t)}</strong>
                            <div style={{ marginTop: 4 }}>
                              <TargetStatusBadge status={t.status} />
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="list">
                    {p.targets.map((t) => {
                      const r = t.readiness;
                      const next = r?.nextDeadline;
                      const days = next ? daysFromNow(next.at) : null;
                      return (
                        <Link key={t.id} to={`/targets/${t.id}`} className="card-link">
                          <Card hover>
                            <div className="list-row" style={{ alignItems: 'flex-start' }}>
                              <div className="row-main">
                                <div className="row">
                                  <span className="row-title" style={{ fontSize: 16 }}>
                                    {targetName(t)}
                                  </span>
                                  <TargetStatusBadge status={t.status} />
                                </div>
                                <span className="row-sub">
                                  {t.conferenceName}
                                  {t.track ? ` · ${t.track}` : ''}
                                </span>
                                {t.status === 'ARCHIVED' ? (
                                  <span className="row-sub">
                                    Lưu trữ {formatDateTime(t.archivedAt)}
                                    {t.archiveReason ? ` — ${t.archiveReason}` : ''}
                                  </span>
                                ) : (
                                  r && (
                                    <div className="row" style={{ marginTop: 8 }}>
                                      <Badge tone="healthy">{r.verified} đã xác nhận</Badge>
                                      {r.pendingVerification > 0 && <Badge tone="info">{r.pendingVerification} chờ xác minh</Badge>}
                                      {r.needsAction > 0 && <Badge tone="critical">{r.needsAction} cần xử lý</Badge>}
                                      {r.notReviewed > 0 && <Badge tone="watch">{r.notReviewed} chưa rà soát</Badge>}
                                      {r.overdueTasks > 0 && <Badge tone="critical">{r.overdueTasks} Task quá hạn</Badge>}
                                    </div>
                                  )
                                )}
                              </div>
                              <div className="row-side" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                                {t.status === 'ACTIVE' && next && days !== null && (
                                  <>
                                    <span className="small muted">{deadlineKindLabel[next.kind] ?? next.kind}</span>
                                    <Badge tone={deadlineTone(days)}>{relativeDays(days)}</Badge>
                                  </>
                                )}
                                <span className="small muted">
                                  {t._count.requirements} Requirement · {t._count.tasks} Task
                                </span>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <PaperFormModal open={editing} paper={p} onClose={() => setEditing(false)} onSaved={() => paper.reload()} />

            <TargetFormModal
              open={creatingTarget}
              paperId={p.id}
              onClose={() => setCreatingTarget(false)}
              onSaved={(id) => navigate(`/targets/${id}`)}
            />
          </>
        );
      }}
    </Async>
  );
}
