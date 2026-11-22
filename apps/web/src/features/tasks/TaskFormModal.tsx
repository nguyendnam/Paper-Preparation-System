import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, errorMessage } from '../../api/client';
import type { Group, RequirementItem, TaskItem, TaskStatus } from '../../api/types';
import { Async, Button, Dialog, Field } from '../../components/ui';
import { isoToZonedLocal, requirementStatusLabel, roleLabel, taskStatusLabel, zonedLocalToIso } from '../../lib/format';
import { useResource } from '../../lib/useResource';

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function Form({
  targetId,
  task,
  members,
  requirements,
  onClose,
  onSaved,
}: {
  targetId: string;
  task?: TaskItem;
  members: Group['members'];
  requirements: RequirementItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '');
  // Deadlines of tasks are entered in the browser's local time.
  const [dueAt, setDueAt] = useState(isoToZonedLocal(task?.dueAt, localTimeZone));
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'TODO');
  const [selected, setSelected] = useState<Set<string>>(new Set(task?.requirements.map((r) => r.id) ?? []));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    const body = {
      title,
      description: description.trim() || null,
      assigneeId: assigneeId || null,
      dueAt: zonedLocalToIso(dueAt, localTimeZone),
      status,
      requirementIds: [...selected],
    };

    try {
      if (task) await api.patch(`/tasks/${task.id}`, body);
      else await api.post(`/targets/${targetId}/tasks`, body);
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={(e) => void submit(e)}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-grid">
        <Field label="Tiêu đề công việc" required full>
          {(id) => (
            <input id={id} className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          )}
        </Field>

        <Field label="Mô tả" full>
          {(id) => (
            <textarea id={id} className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          )}
        </Field>

        <Field label="Người phụ trách">
          {(id) => (
            <select id={id} className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">— Chưa phân công —</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName} ({roleLabel[m.role]})
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Deadline">
          {(id) => <input id={id} className="input" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />}
        </Field>

        <Field label="Trạng thái">
          {(id) => (
            <select id={id} className="input" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {(Object.keys(taskStatusLabel) as TaskStatus[]).map((s) => (
                <option key={s} value={s}>
                  {taskStatusLabel[s]}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="field full">
          <span className="field-label">Requirement liên quan</span>
          {requirements.length === 0 ? (
            <span className="field-hint">Chưa có Requirement. Task điều phối chung có thể không gắn Requirement.</span>
          ) : (
            <div className="check-list">
              {requirements.map((r) => (
                <label key={r.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(r.id);
                      else next.delete(r.id);
                      setSelected(next);
                    }}
                  />
                  <span>
                    {r.description}
                    <span className="small muted"> — {requirementStatusLabel[r.status]}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <span className="field-hint">Hoàn thành Task không tự động làm Requirement chuyển sang “Đã xác nhận đáp ứng”.</span>
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>
          Hủy
        </Button>
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? 'Đang lưu…' : task ? 'Lưu thay đổi' : 'Tạo Task'}
        </Button>
      </div>
    </form>
  );
}

function Loader({
  targetId,
  groupId,
  task,
  onClose,
  onSaved,
}: {
  targetId: string;
  groupId: string;
  task?: TaskItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const groups = useResource<Group[]>('/groups');
  const requirements = useResource<RequirementItem[]>(`/targets/${targetId}/requirements`);

  return (
    <Async state={groups}>
      {(groupList) => (
        <Async state={requirements}>
          {(reqs) => (
            <Form
              targetId={targetId}
              task={task}
              members={groupList.find((g) => g.id === groupId)?.members ?? []}
              requirements={reqs}
              onClose={onClose}
              onSaved={onSaved}
            />
          )}
        </Async>
      )}
    </Async>
  );
}

export function TaskFormModal({
  open,
  targetId,
  groupId,
  task,
  onClose,
  onSaved,
}: {
  open: boolean;
  targetId: string;
  groupId: string;
  task?: TaskItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog
      open={open}
      title={task ? 'Chỉnh sửa Task' : 'Tạo Task'}
      description="Task là việc cần làm có người phụ trách, deadline và trạng thái."
      onClose={onClose}
      wide
    >
      <Loader targetId={targetId} groupId={groupId} task={task} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  );
}
