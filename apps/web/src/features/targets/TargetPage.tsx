import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import type {
  Group,
  ReadinessView,
  RequirementItem,
  RequirementStatus,
  TargetDetail,
  TaskItem,
  TaskList,
} from '../../api/types';
import { useToast } from '../../components/Toast';
import {
  Async,
  Button,
  Card,
  Dialog,
  Field,
  Icon,
  PageHeader,
  TargetStatusBadge,
  Tabs,
} from '../../components/ui';
import {
  formatDateTime,
  timezoneLabel,
  targetName,
} from '../../lib/format';
import { useDebounced } from '../../lib/useDebounced';
import { useResource } from '../../lib/useResource';
import { ReadinessPanel } from '../readiness/ReadinessPanel';
import { RequirementDetailModal } from '../requirements/RequirementDetailModal';
import { RequirementFormModal } from '../requirements/RequirementFormModal';
import { RequirementsTab } from '../requirements/RequirementsTab';
import type { RequirementFilters } from '../requirements/RequirementsTab';
import { TaskFormModal } from '../tasks/TaskFormModal';
import { TasksTab } from '../tasks/TasksTab';
import { TargetFormModal } from './TargetFormModal';
import { TransferModal } from './TransferModal';

type Tab = 'overview' | 'requirements' | 'tasks';

function ArchiveDialog({
  target,
  onClose,
  onDone,
}: {
  target: TargetDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/targets/${target.id}/archive`, { reason: reason.trim() || undefined });
      onDone();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      title="Lưu trữ Submission Target"
      description="Target chuyển sang ARCHIVED và chỉ có thể xem. Bài báo sẽ không có Target đang hoạt động cho đến khi bạn tạo Target mới."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Đang lưu trữ…' : 'Lưu trữ Target'}
          </Button>
        </>
      }
    >
      <div className="stack">
        {error && <div className="form-error">{error}</div>}
        <Field label="Lý do" hint="Tùy chọn.">
          {(id) => <textarea id={id} className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </div>
    </Dialog>
  );
}

function TargetInfo({ target }: { target: TargetDetail }) {
  return (
    <Card>
      <dl className="kv">
        <dt>Hội nghị</dt>
        <dd>
          {target.conferenceName}
          {target.edition ? ` (${target.edition})` : ''}
        </dd>
        <dt>Track</dt>
        <dd>{target.track || 'Chưa xác định'}</dd>
        <dt>CFP</dt>
        <dd>
          {target.cfpUrl ? (
            <a className="link" href={target.cfpUrl} target="_blank" rel="noreferrer noopener">
              {target.cfpUrl}
            </a>
          ) : (
            'Chưa ghi nhận'
          )}
        </dd>
        <dt>Author Guidelines</dt>
        <dd>
          {target.authorGuidelinesUrl ? (
            <a className="link" href={target.authorGuidelinesUrl} target="_blank" rel="noreferrer noopener">
              {target.authorGuidelinesUrl}
            </a>
          ) : (
            'Chưa ghi nhận'
          )}
        </dd>
        <dt>Múi giờ deadline</dt>
        <dd>{timezoneLabel(target.timezone)}</dd>
        <dt>Nguồn deadline</dt>
        <dd>{target.deadlineSource || 'Chưa ghi nhận nguồn'}</dd>
      </dl>
    </Card>
  );
}

export function TargetPage() {
  const { targetId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useSearchParams();

  const tab = (search.get('tab') as Tab | null) ?? 'overview';
  const setTab = (next: Tab) => setSearch({ tab: next }, { replace: true });

  const [filters, setFilters] = useState<RequirementFilters>({ status: '', type: '', q: '' });
  const q = useDebounced(filters.q);

  const requirementsPath = (() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.type) params.set('type', filters.type);
    if (q.trim()) params.set('q', q.trim());
    const qs = params.toString();
    return `/targets/${targetId}/requirements${qs ? `?${qs}` : ''}`;
  })();

  const target = useResource<TargetDetail>(`/targets/${targetId}`);
  const readiness = useResource<ReadinessView>(`/targets/${targetId}/readiness`);
  const requirements = useResource<RequirementItem[]>(requirementsPath, { keepPrevious: true });
  const tasks = useResource<TaskList>(`/targets/${targetId}/tasks`);
  const groups = useResource<Group[]>('/groups');

  const [openRequirement, setOpenRequirement] = useState<string | null>(null);
  const [creatingRequirement, setCreatingRequirement] = useState(false);
  const [taskForm, setTaskForm] = useState<{ open: boolean; task?: TaskItem }>({ open: false });
  const [editingTarget, setEditingTarget] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const refreshAll = () => {
    target.reload();
    readiness.reload();
    requirements.reload();
    tasks.reload();
  };

  return (
    <Async state={target}>
      {(t) => {
        const writable = t.status === 'ACTIVE';
        const canEdit = Boolean(t.permissions.canEdit);
        const members = groups.data?.find((g) => g.id === t.group.id)?.members ?? [];

        return (
          <>
            <PageHeader
              crumbs={[
                { label: 'Bài báo', to: '/papers' },
                { label: t.paper.title, to: `/papers/${t.paperId}` },
                { label: targetName(t) },
              ]}
              eyebrow="Submission Target"
              title={
                <span className="row" style={{ gap: 12 }}>
                  {targetName(t)}
                  <TargetStatusBadge status={t.status} />
                </span>
              }
              description={`${t.conferenceName}${t.track ? ` · ${t.track}` : ''}`}
              actions={
                canEdit && (
                  <>
                    <Button icon="pencil-outline" onClick={() => setEditingTarget(true)}>
                      Cập nhật
                    </Button>
                    <Button icon="archive-outline" onClick={() => setArchiving(true)}>
                      Lưu trữ
                    </Button>
                    <Button variant="primary" icon="swap-horizontal" onClick={() => setTransferring(true)}>
                      Chuyển hội nghị
                    </Button>
                  </>
                )
              }
            />

            {!writable && (
              <div className="archived-banner">
                <Icon name="archive-outline" size={22} />
                <div style={{ lineHeight: 1.5 }}>
                  <strong>Target đã được lưu trữ (ARCHIVED)</strong> — {formatDateTime(t.archivedAt)}
                  {t.archivedByName ? ` bởi ${t.archivedByName}` : ''}. Dữ liệu được giữ nguyên để tra cứu; không thể chỉnh sửa.
                  {t.archiveReason && (
                    <>
                      <br />
                      Lý do: {t.archiveReason}
                    </>
                  )}
                  {t.nextTarget && (
                    <>
                      <br />
                      Target kế tiếp:{' '}
                      <Link className="link" to={`/targets/${t.nextTarget.id}`}>
                        {targetName(t.nextTarget)}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}

            {t.previousTarget && (
              <p className="small muted" style={{ marginBottom: 16 }}>
                <Icon name="source-branch" size={14} /> Tiếp nối từ{' '}
                <Link className="link" to={`/targets/${t.previousTarget.id}`}>
                  {targetName(t.previousTarget)}
                </Link>{' '}
                (Evidence và Verification không được kế thừa).
              </p>
            )}

            <div style={{ marginBottom: 20 }}>
              <Tabs<Tab>
                value={tab}
                onChange={setTab}
                tabs={[
                  { id: 'overview', label: 'Tổng quan chuẩn bị', icon: 'chart-box-outline' },
                  { id: 'requirements', label: 'Requirement', icon: 'format-list-checks', count: t.counts.requirements },
                  { id: 'tasks', label: 'Task', icon: 'clipboard-text-outline', count: t.counts.tasks },
                ]}
              />
            </div>

            {tab === 'overview' && (
              <div className="stack">
                <Async state={readiness}>
                  {(view) => (
                    <ReadinessPanel
                      view={view}
                      timezone={t.timezone}
                      onOpenRequirement={setOpenRequirement}
                      onFilterStatus={(status: RequirementStatus | '') => {
                        setFilters((f) => ({ ...f, status }));
                        setTab('requirements');
                      }}
                    />
                  )}
                </Async>
                <section>
                  <div className="section-header-row">
                    <h2 className="section-title">Thông tin hội nghị</h2>
                  </div>
                  <TargetInfo target={t} />
                </section>
              </div>
            )}

            {tab === 'requirements' && (
              <Async state={requirements}>
                {(items) => (
                  <RequirementsTab
                    items={items}
                    filters={filters}
                    onFiltersChange={setFilters}
                    canManage={t.permissions.canManage}
                    writable={writable}
                    onOpen={setOpenRequirement}
                    onCreate={() => setCreatingRequirement(true)}
                  />
                )}
              </Async>
            )}

            {tab === 'tasks' && (
              <Async state={tasks}>
                {(list) => (
                  <TasksTab
                    items={list.items}
                    permissions={list.permissions}
                    writable={writable}
                    members={members}
                    onCreate={() => setTaskForm({ open: true })}
                    onEdit={(task) => setTaskForm({ open: true, task })}
                    onChanged={refreshAll}
                  />
                )}
              </Async>
            )}

            <RequirementDetailModal
              requirementId={openRequirement}
              onClose={() => setOpenRequirement(null)}
              onChanged={refreshAll}
            />

            <RequirementFormModal
              open={creatingRequirement}
              targetId={t.id}
              defaultSourceUrl={t.cfpUrl}
              onClose={() => setCreatingRequirement(false)}
              onSaved={refreshAll}
            />

            <TaskFormModal
              open={taskForm.open}
              targetId={t.id}
              groupId={t.group.id}
              task={taskForm.task}
              onClose={() => setTaskForm({ open: false })}
              onSaved={refreshAll}
            />

            <TargetFormModal
              open={editingTarget}
              paperId={t.paperId}
              target={t}
              onClose={() => setEditingTarget(false)}
              onSaved={refreshAll}
            />

            {transferring && (
              <TransferModal
                open
                target={t}
                onClose={() => setTransferring(false)}
                onDone={(result) => {
                  setTransferring(false);
                  toast(
                    `Đã lưu trữ Target cũ và tạo Target mới (sao chép ${result.copiedRequirements} Requirement, ${result.copiedTasks} Task).`,
                  );
                  navigate(`/targets/${result.id}`);
                }}
              />
            )}

            {archiving && (
              <ArchiveDialog
                target={t}
                onClose={() => setArchiving(false)}
                onDone={() => {
                  toast('Đã lưu trữ Submission Target.');
                  refreshAll();
                }}
              />
            )}
          </>
        );
      }}
    </Async>
  );
}
