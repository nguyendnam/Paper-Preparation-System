import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/client';
import type { DashboardData } from '../api/types';
import { useAuth } from '../components/Auth';
import {
  Async,
  Badge,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  RequirementTypeBadge,
  TaskStatusBadge,
} from '../components/ui';
import {
  daysFromNow,
  deadlineKindLabel,
  deadlineTone,
  formatDate,
  formatDateTime,
  relativeDays,
  targetName,
} from '../lib/format';
import { useResource } from '../lib/useResource';

interface Health {
  status: string;
  database: string;
}

function SystemStatus() {
  const [health, setHealth] = useState<Health | 'error' | null>(null);

  useEffect(() => {
    api
      .get<Health>('/health')
      .then(setHealth)
      .catch(() => setHealth('error'));
  }, []);

  if (health === null) return null;
  const ok = health !== 'error' && health.status === 'ok';

  return (
    <Badge tone={ok ? 'healthy' : 'critical'} icon={ok ? 'database-check-outline' : 'database-alert-outline'}>
      {ok ? 'API · Database kết nối' : 'API không khả dụng'}
    </Badge>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const dashboard = useResource<DashboardData>('/dashboard');

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title={`Xin chào, ${user.displayName.split(' ').slice(-1)[0]}`}
        description="Tổng quan các bài báo đang chuẩn bị, mốc deadline sắp tới và việc cần bạn xử lý."
        actions={<SystemStatus />}
      />

      <Async state={dashboard}>
        {(data) => {
          if (user.memberships.length === 0) {
            return (
              <EmptyState icon="account-group-outline" action={<Link className="btn btn--primary" to="/team">Tạo nhóm nghiên cứu</Link>}>
                Bạn chưa thuộc nhóm nghiên cứu nào. Hãy tạo nhóm mới (bạn sẽ là Main Author) hoặc nhờ Main Author thêm bạn theo email.
              </EmptyState>
            );
          }

          const { totals } = data;

          return (
            <>
              <div className="kpi-grid">
                <Card className="kpi-card">
                  <span className="kpi-icon">
                    <Icon name="target" size={22} />
                  </span>
                  <div>
                    <strong className="kpi-val">{totals.activeTargets}</strong>
                    <span className="kpi-label">Target đang hoạt động</span>
                  </div>
                </Card>
                <Card className="kpi-card">
                  <span className="kpi-icon info">
                    <Icon name="clipboard-text-outline" size={22} />
                  </span>
                  <div>
                    <strong className="kpi-val">{totals.openMyTasks}</strong>
                    <span className="kpi-label">Task đang mở của tôi</span>
                  </div>
                </Card>
                <Card className="kpi-card">
                  <span className="kpi-icon watch">
                    <Icon name="alert-octagon-outline" size={22} />
                  </span>
                  <div>
                    <strong className="kpi-val">{totals.mandatoryOutstanding}</strong>
                    <span className="kpi-label">Yêu cầu bắt buộc còn mở</span>
                  </div>
                </Card>
                <Card className="kpi-card">
                  <span className="kpi-icon critical">
                    <Icon name="clock-alert-outline" size={22} />
                  </span>
                  <div>
                    <strong className="kpi-val">{totals.overdueTasks}</strong>
                    <span className="kpi-label">Task quá hạn</span>
                  </div>
                </Card>
              </div>

              <section className="section">
                <div className="section-header-row">
                  <h2 className="section-title">Deadline sắp tới</h2>
                  <Link className="link small" to="/papers">
                    Xem tất cả bài báo →
                  </Link>
                </div>

                {data.activeTargets.length === 0 ? (
                  <EmptyState icon="calendar-blank-outline" action={<Link className="btn btn--primary" to="/papers">Đến danh sách bài báo</Link>}>
                    Chưa có Submission Target đang hoạt động. Hãy tạo bài báo và Target để theo dõi deadline.
                  </EmptyState>
                ) : (
                  <div className="grid-2">
                    {data.activeTargets.map((t) => {
                      const r = t.readiness;
                      const next = r.nextDeadline;
                      const days = next ? daysFromNow(next.at) : null;
                      return (
                        <Link key={t.id} to={`/targets/${t.id}`} className="card-link">
                          <Card hover style={{ height: '100%' }}>
                            <span className="eyebrow">{t.paper.title}</span>
                            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '4px 0 2px' }}>{targetName(t)}</h3>
                            <p className="small muted">{t.track ?? 'Chưa xác định track'}</p>

                            <div style={{ marginTop: 12 }}>
                              {next && days !== null ? (
                                <div className="row">
                                  <Badge tone={deadlineTone(days)} icon="clock-outline">
                                    {relativeDays(days)}
                                  </Badge>
                                  <span className="small muted">
                                    {deadlineKindLabel[next.kind] ?? next.kind}: {formatDateTime(next.at, t.timezone)}
                                  </span>
                                </div>
                              ) : (
                                <span className="small muted">Chưa có deadline sắp tới</span>
                              )}
                            </div>

                            <div className="row" style={{ marginTop: 12 }}>
                              <Badge tone="healthy">{r.verified} đã xác nhận</Badge>
                              {r.pendingVerification > 0 && <Badge tone="info">{r.pendingVerification} chờ xác minh</Badge>}
                              {r.needsAction > 0 && <Badge tone="critical">{r.needsAction} cần xử lý</Badge>}
                              {r.notReviewed > 0 && <Badge tone="watch">{r.notReviewed} chưa rà soát</Badge>}
                              {r.mandatoryOutstanding > 0 && <Badge tone="low">{r.mandatoryOutstanding} bắt buộc còn mở</Badge>}
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="grid-2 section" style={{ alignItems: 'start' }}>
                <section>
                  <div className="section-header-row">
                    <h2 className="section-title">Công việc của tôi</h2>
                    <Link className="link small" to="/tasks">
                      Xem tất cả →
                    </Link>
                  </div>
                  {data.myTasks.length === 0 ? (
                    <EmptyState icon="check-all">Không có Task nào đang mở.</EmptyState>
                  ) : (
                    <div className="list">
                      {data.myTasks.map((task) => (
                        <Link key={task.id} to={`/targets/${task.target.id}?tab=tasks`} className="card-link">
                          <Card size="sm" hover>
                            <div className="list-row">
                              <div className="row-main">
                                <span className="row-title">{task.title}</span>
                                <span className="row-sub">
                                  {targetName(task.target)} · hạn {formatDate(task.dueAt)}
                                </span>
                              </div>
                              <div className="row-side">
                                {task.overdue && <Badge tone="critical">Quá hạn</Badge>}
                                <TaskStatusBadge status={task.status} />
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <div className="section-header-row">
                    <h2 className="section-title">Chờ xác minh</h2>
                  </div>
                  {data.pendingVerification.length === 0 ? (
                    <EmptyState icon="clipboard-check-outline">
                      Không có Requirement nào đang chờ bạn xác minh.
                    </EmptyState>
                  ) : (
                    <div className="list">
                      {data.pendingVerification.map((r) => (
                        <Link key={r.id} to={`/targets/${r.target.id}?tab=requirements`} className="card-link">
                          <Card size="sm" hover>
                            <div className="list-row">
                              <div className="row-main">
                                <span className="row-title">{r.description}</span>
                                <span className="row-sub">
                                  {targetName(r.target)} · {r.target.paper.title}
                                </span>
                              </div>
                              <RequirementTypeBadge type={r.type} />
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="callout info" style={{ marginTop: 32 }}>
                Hệ thống không tính điểm “Readiness” và không tự kết luận bài báo đã sẵn sàng. Nhóm tự quyết định thời điểm nộp bài và thực hiện
                thao tác nộp trên nền tảng chính thức của hội nghị.
              </div>
            </>
          );
        }}
      </Async>
    </>
  );
}
