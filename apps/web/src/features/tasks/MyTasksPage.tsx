import { useState } from 'react';
import { Link } from 'react-router-dom';

import { api, errorMessage } from '../../api/client';
import type { MyTaskItem, TaskStatus } from '../../api/types';
import { useToast } from '../../components/Toast';
import { Async, Badge, Card, EmptyState, Icon, PageHeader } from '../../components/ui';
import {
  daysFromNow,
  deadlineTone,
  formatDate,
  relativeDays,
  targetName,
  taskStatusLabel,
} from '../../lib/format';
import { useResource } from '../../lib/useResource';

const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

export function MyTasksPage() {
  const toast = useToast();
  const [includeDone, setIncludeDone] = useState(false);
  const tasks = useResource<MyTaskItem[]>(`/me/tasks${includeDone ? '?includeDone=true' : ''}`, {
    keepPrevious: true,
  });

  const changeStatus = async (task: MyTaskItem, status: TaskStatus) => {
    try {
      await api.patch(`/tasks/${task.id}`, { status });
      tasks.reload();
    } catch (err) {
      toast(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Công việc"
        title="Công việc của tôi"
        description="Task được giao cho bạn trên các Submission Target đang hoạt động. Cập nhật trạng thái để cả nhóm không phải hỏi lại tiến độ."
      />

      <div className="filter-bar">
        <label className="checkbox-row">
          <input type="checkbox" checked={includeDone} onChange={(e) => setIncludeDone(e.target.checked)} />
          <span>Hiển thị cả Task đã hoàn thành</span>
        </label>
      </div>

      <Async state={tasks}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState icon="check-all">Bạn không có Task nào đang mở. 🎉</EmptyState>
          ) : (
            <div className="list">
              {items.map((task) => {
                const days = task.dueAt ? daysFromNow(task.dueAt) : null;
                const overdue = days !== null && days < 0 && task.status !== 'DONE';
                return (
                  <Card key={task.id} size="sm">
                    <div className="list-row" style={{ alignItems: 'flex-start' }}>
                      <div className="row-main">
                        <span className="row-title">{task.title}</span>
                        <span className="row-sub">
                          <Link className="link" to={`/targets/${task.target.id}?tab=tasks`}>
                            {targetName(task.target)}
                          </Link>{' '}
                          ·{' '}
                          <Link className="link" to={`/papers/${task.target.paper.id}`}>
                            {task.target.paper.title}
                          </Link>
                        </span>
                        <div className="row" style={{ marginTop: 8 }}>
                          <span className="small muted">
                            <Icon name="calendar-outline" size={12} /> {formatDate(task.dueAt)}
                          </span>
                          {days !== null && task.status !== 'DONE' && (
                            <Badge tone={overdue ? 'critical' : deadlineTone(days)}>{relativeDays(days)}</Badge>
                          )}
                          {task.requirements.length > 0 && (
                            <span className="small muted">
                              <Icon name="link-variant" size={12} /> {task.requirements.length} Requirement
                            </span>
                          )}
                        </div>
                      </div>
                      <select
                        className="input"
                        style={{ width: 'auto', minHeight: 32 }}
                        value={task.status}
                        onChange={(e) => void changeStatus(task, e.target.value as TaskStatus)}
                        aria-label="Trạng thái Task"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {taskStatusLabel[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        }
      </Async>
    </>
  );
}
