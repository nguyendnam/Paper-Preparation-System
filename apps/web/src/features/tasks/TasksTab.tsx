import { useState } from 'react';

import { api, errorMessage } from '../../api/client';
import type { Group, Permissions, TaskItem, TaskStatus } from '../../api/types';
import { useAuth } from '../../components/Auth';
import { useToast } from '../../components/Toast';
import { Avatar, Badge, Button, Card, EmptyState, Icon, Tabs, TaskStatusBadge } from '../../components/ui';
import { daysFromNow, formatDate, relativeDays, taskStatusLabel, deadlineTone } from '../../lib/format';

type View = 'list' | 'board';

const columns: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

function DueBadge({ task }: { task: TaskItem }) {
  if (!task.dueAt) return <span className="small muted">Chưa có deadline</span>;
  const days = daysFromNow(task.dueAt);
  const overdue = days < 0 && task.status !== 'DONE';
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className="small muted">
        <Icon name="calendar-outline" size={12} /> {formatDate(task.dueAt)}
      </span>
      {task.status !== 'DONE' && <Badge tone={overdue ? 'critical' : deadlineTone(days)}>{relativeDays(days)}</Badge>}
    </span>
  );
}

function TaskCard({
  task,
  canChangeStatus,
  canManage,
  onStatus,
  onEdit,
  onDelete,
}: {
  task: TaskItem;
  canChangeStatus: boolean;
  canManage: boolean;
  onStatus: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card size="sm">
      <div className="list-row" style={{ alignItems: 'flex-start' }}>
        <div className="row-main">
          <span className="row-title">{task.title}</span>
          {task.description && <span className="row-sub">{task.description}</span>}
          <div className="row" style={{ marginTop: 8 }}>
            {task.assignee ? (
              <span className="row" style={{ gap: 6 }}>
                <Avatar name={task.assignee.displayName} small />
                <span className="small">{task.assignee.displayName}</span>
              </span>
            ) : (
              <Badge tone="watch">Chưa phân công</Badge>
            )}
            <DueBadge task={task} />
          </div>
          {task.requirements.length > 0 && (
            <div className="small muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
              <Icon name="link-variant" size={12} /> {task.requirements.map((r) => r.description).join(' · ').slice(0, 140)}
            </div>
          )}
        </div>
        <div className="row-side" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          {canChangeStatus ? (
            <select
              className="input"
              style={{ width: 'auto', minHeight: 30, padding: '2px 8px' }}
              value={task.status}
              onChange={(e) => onStatus(e.target.value as TaskStatus)}
              aria-label="Trạng thái Task"
            >
              {columns.map((s) => (
                <option key={s} value={s}>
                  {taskStatusLabel[s]}
                </option>
              ))}
            </select>
          ) : (
            <TaskStatusBadge status={task.status} />
          )}
          {canManage && (
            <div className="row" style={{ gap: 2 }}>
              <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Chỉnh sửa Task">
                <Icon name="pencil-outline" size={15} />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Xóa Task">
                <Icon name="trash-can-outline" size={15} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function TasksTab({
  items,
  permissions,
  writable,
  members,
  onCreate,
  onEdit,
  onChanged,
}: {
  items: TaskItem[];
  permissions: Permissions;
  writable: boolean;
  members: Group['members'];
  onCreate: () => void;
  onEdit: (task: TaskItem) => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [view, setView] = useState<View>('list');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [assignee, setAssignee] = useState('');

  const canManage = permissions.canManage && writable;

  const filtered = items.filter(
    (t) =>
      (status === '' || t.status === status) &&
      (assignee === '' || (assignee === 'none' ? !t.assigneeId : t.assigneeId === assignee)),
  );

  const changeStatus = async (task: TaskItem, next: TaskStatus) => {
    try {
      await api.patch(`/tasks/${task.id}`, { status: next });
      onChanged();
    } catch (err) {
      toast(errorMessage(err));
    }
  };

  const remove = async (task: TaskItem) => {
    if (!window.confirm(`Xóa Task “${task.title}”?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      onChanged();
    } catch (err) {
      toast(errorMessage(err));
    }
  };

  const card = (task: TaskItem) => (
    <TaskCard
      key={task.id}
      task={task}
      canChangeStatus={writable && (canManage || task.assigneeId === user.id)}
      canManage={canManage}
      onStatus={(next) => void changeStatus(task, next)}
      onEdit={() => onEdit(task)}
      onDelete={() => void remove(task)}
    />
  );

  return (
    <div>
      <div className="filter-bar">
        <div className="row">
          <Tabs<View>
            value={view}
            onChange={setView}
            tabs={[
              { id: 'list', label: 'Danh sách', icon: 'format-list-bulleted' },
              { id: 'board', label: 'Bảng', icon: 'view-column-outline' },
            ]}
          />
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus | '')}
            aria-label="Lọc theo trạng thái"
          >
            <option value="">Mọi trạng thái</option>
            {columns.map((s) => (
              <option key={s} value={s}>
                {taskStatusLabel[s]}
              </option>
            ))}
          </select>
          <select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Lọc theo người phụ trách">
            <option value="">Mọi người phụ trách</option>
            <option value="none">Chưa phân công</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>
        {canManage && (
          <Button variant="primary" icon="plus" onClick={onCreate}>
            Tạo Task
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="clipboard-text-outline"
          action={
            canManage ? (
              <Button variant="primary" size="sm" onClick={onCreate}>
                + Tạo Task đầu tiên
              </Button>
            ) : undefined
          }
        >
          Chưa có Task. Tạo Task khi cần chuyển một yêu cầu hoặc mục tiêu thành công việc có người phụ trách và deadline.
        </EmptyState>
      ) : view === 'list' ? (
        filtered.length === 0 ? (
          <EmptyState icon="filter-outline">Không có Task nào khớp bộ lọc.</EmptyState>
        ) : (
          <div className="list">{filtered.map(card)}</div>
        )
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {columns.map((col) => {
            const colItems = filtered.filter((t) => t.status === col);
            return (
              <div key={col} className="stack-sm" style={{ alignContent: 'start' }}>
                <div className="row-between" style={{ padding: '0 4px' }}>
                  <TaskStatusBadge status={col} />
                  <span className="small muted">{colItems.length}</span>
                </div>
                {colItems.map(card)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
