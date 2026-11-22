import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, errorMessage } from '../../api/client';
import type { RequirementItem, TargetDetail, TaskList } from '../../api/types';
import { Async, Button, Dialog, Field } from '../../components/ui';
import { requirementTypeLabel, targetName, taskStatusLabel } from '../../lib/format';
import { useResource } from '../../lib/useResource';
import { TargetFields } from './TargetFields';
import { emptyTargetForm, targetFormToBody } from './targetForm';
import type { TargetFormState } from './targetForm';

interface TransferResult {
  id: string;
  copiedRequirements: number;
  copiedTasks: number;
}

function Form({
  target,
  requirements,
  tasks,
  onClose,
  onDone,
}: {
  target: TargetDetail;
  requirements: RequirementItem[];
  tasks: TaskList['items'];
  onClose: () => void;
  onDone: (result: TransferResult) => void;
}) {
  const [form, setForm] = useState<TargetFormState>(emptyTargetForm);
  const [reason, setReason] = useState('');
  const [reqIds, setReqIds] = useState<Set<string>>(new Set());
  const [taskIds, setTaskIds] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    setter(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api.post<TransferResult>(`/targets/${target.id}/transfer`, {
        reason: reason.trim() || undefined,
        newTarget: targetFormToBody(form),
        copyRequirementIds: [...reqIds],
        copyTaskIds: [...taskIds],
      });
      onDone(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={(e) => void submit(e)}>
      {error && <div className="form-error">{error}</div>}

      <div className="callout info">
        <strong>Điều sẽ xảy ra:</strong> {targetName(target)} được chuyển sang <strong>ARCHIVED</strong> và giữ nguyên toàn bộ dữ liệu
        (chỉ xem). Một Target mới độc lập được tạo cho cùng Paper. Evidence và Verification <strong>không</strong> được kế thừa. Tất cả
        thao tác được thực hiện trong một giao dịch: nếu có lỗi, không có thay đổi nào được lưu.
      </div>

      <Field label="Lý do chuyển mục tiêu" hint="Tùy chọn, được lưu cùng Target đã lưu trữ.">
        {(id) => (
          <textarea id={id} className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        )}
      </Field>

      <section>
        <h3 className="card-title">1. Thông tin Target mới</h3>
        <TargetFields value={form} onChange={setForm} />
      </section>

      <section>
        <div className="row-between">
          <h3 className="card-title">2. Sao chép Requirement có kiểm soát ({reqIds.size}/{requirements.length})</h3>
          {requirements.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReqIds(reqIds.size === requirements.length ? new Set() : new Set(requirements.map((r) => r.id)))}
            >
              {reqIds.size === requirements.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </Button>
          )}
        </div>
        <p className="small muted" style={{ marginBottom: 8, lineHeight: 1.5 }}>
          Bản sao là bản ghi mới ở trạng thái <em>Chưa rà soát</em>, không mang theo URL nguồn cũ; cần đối chiếu lại với CFP của hội nghị mới.
        </p>
        {requirements.length === 0 ? (
          <p className="small muted">Target hiện tại chưa có Requirement.</p>
        ) : (
          <div className="check-list">
            {requirements.map((r) => (
              <label key={r.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={reqIds.has(r.id)}
                  onChange={(e) => toggle(reqIds, setReqIds, r.id, e.target.checked)}
                />
                <span>
                  {r.description} <span className="small muted">— {requirementTypeLabel[r.type]}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="row-between">
          <h3 className="card-title">3. Sao chép Task có kiểm soát ({taskIds.size}/{tasks.length})</h3>
          {tasks.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setTaskIds(taskIds.size === tasks.length ? new Set() : new Set(tasks.map((t) => t.id)))}
            >
              {taskIds.size === tasks.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </Button>
          )}
        </div>
        <p className="small muted" style={{ marginBottom: 8, lineHeight: 1.5 }}>
          Task mới bắt đầu ở trạng thái <em>Chưa bắt đầu</em>; người phụ trách và deadline phải được thiết lập lại.
        </p>
        {tasks.length === 0 ? (
          <p className="small muted">Target hiện tại chưa có Task.</p>
        ) : (
          <div className="check-list">
            {tasks.map((t) => (
              <label key={t.id} className="checkbox-row">
                <input type="checkbox" checked={taskIds.has(t.id)} onChange={(e) => toggle(taskIds, setTaskIds, t.id, e.target.checked)} />
                <span>
                  {t.title} <span className="small muted">— {taskStatusLabel[t.status]}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      <label className="checkbox-row">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        <span>
          Tôi xác nhận lưu trữ <strong>{targetName(target)}</strong> và tạo Target mới. Target đã lưu trữ chỉ có thể xem.
        </span>
      </label>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>
          Hủy
        </Button>
        <Button variant="primary" type="submit" disabled={busy || !confirmed} icon="swap-horizontal">
          {busy ? 'Đang chuyển…' : 'Lưu trữ & tạo Target mới'}
        </Button>
      </div>
    </form>
  );
}

function Loader(props: {
  target: TargetDetail;
  onClose: () => void;
  onDone: (result: TransferResult) => void;
}) {
  const requirements = useResource<RequirementItem[]>(`/targets/${props.target.id}/requirements`);
  const tasks = useResource<TaskList>(`/targets/${props.target.id}/tasks`);

  return (
    <Async state={requirements}>
      {(reqs) => (
        <Async state={tasks}>
          {(taskList) => <Form {...props} requirements={reqs} tasks={taskList.items} />}
        </Async>
      )}
    </Async>
  );
}

export function TransferModal({
  open,
  target,
  onClose,
  onDone,
}: {
  open: boolean;
  target: TargetDetail;
  onClose: () => void;
  onDone: (result: TransferResult) => void;
}) {
  return (
    <Dialog
      open={open}
      title="Chuyển hội nghị mục tiêu"
      description="Lưu trữ mục tiêu hiện tại, giữ nguyên lịch sử chuẩn bị và tiếp tục với một Submission Target mới."
      onClose={onClose}
      wide
    >
      <Loader target={target} onClose={onClose} onDone={onDone} />
    </Dialog>
  );
}
