import { useState } from 'react';

import { api, errorMessage } from '../../api/client';
import type { RequirementDetail, RequirementStatus, TaskList } from '../../api/types';
import { useAuth } from '../../components/Auth';
import { useToast } from '../../components/Toast';
import {
  Async,
  Button,
  Dialog,
  EmptyState,
  Icon,
  RequirementStatusBadge,
  RequirementTypeBadge,
  TaskStatusBadge,
} from '../../components/ui';
import { formatDate, requirementStatusLabel, sourceTypeLabel } from '../../lib/format';
import { useResource } from '../../lib/useResource';
import { EvidenceSection } from '../evidence/EvidenceSection';
import { VerificationSection } from '../evidence/VerificationSection';
import { RequirementFormModal } from './RequirementFormModal';

function LinkTasksDialog({
  requirement,
  onClose,
  onSaved,
}: {
  requirement: RequirementDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const tasks = useResource<TaskList>(`/targets/${requirement.target.id}/tasks`);
  const [selected, setSelected] = useState<Set<string>>(new Set(requirement.tasks.map((t) => t.id)));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api.put(`/requirements/${requirement.id}/tasks`, { taskIds: [...selected] });
      onSaved();
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
      title="Liên kết Task với Requirement"
      description="Một Requirement có thể liên quan đến nhiều Task. Liên kết chỉ là quan hệ nghiệp vụ, không làm đổi trạng thái Requirement."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void save()}>
            {busy ? 'Đang lưu…' : 'Lưu liên kết'}
          </Button>
        </>
      }
    >
      {error && <div className="form-error">{error}</div>}
      <Async state={tasks}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState icon="clipboard-text-outline">Target này chưa có Task nào để liên kết.</EmptyState>
          ) : (
            <div className="check-list">
              {data.items.map((t) => (
                <label key={t.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(t.id);
                      else next.delete(t.id);
                      setSelected(next);
                    }}
                  />
                  <span>
                    {t.title} <TaskStatusBadge status={t.status} />
                  </span>
                </label>
              ))}
            </div>
          )
        }
      </Async>
    </Dialog>
  );
}

function Body({
  requirement,
  onChanged,
  onClose,
}: {
  requirement: RequirementDetail;
  onChanged: () => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [linking, setLinking] = useState(false);

  const { permissions } = requirement;
  const writable = permissions.writable !== false;
  const canManage = permissions.canManage && writable;
  const archived = requirement.target.status === 'ARCHIVED';

  const statusOptions = (Object.keys(requirementStatusLabel) as RequirementStatus[]).filter(
    (s) => permissions.canConfirm || (s !== 'VERIFIED' && s !== 'NOT_APPLICABLE'),
  );

  const changeStatus = async (status: RequirementStatus) => {
    try {
      await api.patch(`/requirements/${requirement.id}`, { status });
      toast(`Đã chuyển sang “${requirementStatusLabel[status]}”.`);
      onChanged();
    } catch (err) {
      toast(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!window.confirm('Xóa Requirement này cùng Evidence và Verification liên quan?')) return;
    try {
      await api.delete(`/requirements/${requirement.id}`);
      onChanged();
      onClose();
    } catch (err) {
      toast(errorMessage(err));
    }
  };

  return (
    <div className="stack">
      {archived && (
        <div className="archived-banner">
          <Icon name="archive-outline" size={20} />
          <span>Target này đã được lưu trữ (ARCHIVED): chỉ có thể xem.</span>
        </div>
      )}

      <div>
        <div className="row" style={{ marginBottom: 8 }}>
          <RequirementTypeBadge type={requirement.type} />
          <RequirementStatusBadge status={requirement.status} />
          {requirement.needsEvidence && (
            <span className="small muted">
              <Icon name="paperclip" size={12} /> Cần Evidence
            </span>
          )}
        </div>
        <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>{requirement.description}</p>
      </div>

      <dl className="kv">
        <dt>Nguồn</dt>
        <dd>
          {sourceTypeLabel[requirement.sourceType]}
          {requirement.sourceSection ? ` — ${requirement.sourceSection}` : ''}
          {requirement.sourceUrl && (
            <>
              <br />
              <a className="link" href={requirement.sourceUrl} target="_blank" rel="noreferrer noopener">
                {requirement.sourceUrl}
              </a>
            </>
          )}
        </dd>
        <dt>Điều kiện áp dụng</dt>
        <dd>{requirement.condition || 'Áp dụng chung'}</dd>
        <dt>Target</dt>
        <dd>
          {requirement.target.acronym || requirement.target.conferenceName} — {requirement.paper.title}
        </dd>
      </dl>

      {writable && (
        <div className="row">
          <label className="field-label" htmlFor="req-status">
            Trạng thái xử lý
          </label>
          <select
            id="req-status"
            className="input"
            style={{ width: 'auto' }}
            value={requirement.status}
            onChange={(e) => void changeStatus(e.target.value as RequirementStatus)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {requirementStatusLabel[s]}
              </option>
            ))}
          </select>
          {!permissions.canConfirm && (
            <span className="small muted">Chỉ Main Author / Verifier / Supervisor mới xác nhận đáp ứng.</span>
          )}
        </div>
      )}

      {canManage && (
        <div className="row">
          <Button size="sm" icon="pencil-outline" onClick={() => setEditing(true)}>
            Chỉnh sửa
          </Button>
          <Button size="sm" icon="link-variant" onClick={() => setLinking(true)}>
            Liên kết Task
          </Button>
          <Button size="sm" variant="danger-outline" icon="trash-can-outline" onClick={() => void remove()}>
            Xóa
          </Button>
        </div>
      )}

      <section>
        <h3 className="card-title">Task liên quan ({requirement.tasks.length})</h3>
        {requirement.tasks.length === 0 ? (
          <p className="small muted">Chưa liên kết Task. Có thể xử lý trực tiếp nếu không cần công việc riêng.</p>
        ) : (
          <div className="list">
            {requirement.tasks.map((t) => (
              <div key={t.id} className="card card--sm list-row">
                <div className="row-main">
                  <span className="row-title">{t.title}</span>
                  <span className="row-sub">
                    {t.assignee?.displayName ?? 'Chưa phân công'} · hạn {formatDate(t.dueAt)}
                  </span>
                </div>
                <TaskStatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
        {requirement.tasks.length > 0 && requirement.tasks.every((t) => t.status === 'DONE') && requirement.status !== 'VERIFIED' && (
          <div className="callout info" style={{ marginTop: 8 }}>
            Mọi Task liên kết đã hoàn thành, nhưng Requirement chưa được xác nhận. Hoàn thành Task không tự động có nghĩa là đã đáp ứng yêu cầu.
          </div>
        )}
      </section>

      <EvidenceSection
        requirementId={requirement.id}
        items={requirement.evidence}
        canAdd={permissions.canAddEvidence && writable}
        canDelete={(item) => writable && (permissions.canManage || item.createdBy.id === user.id)}
        onChanged={onChanged}
      />

      <VerificationSection
        requirementId={requirement.id}
        items={requirement.verifications}
        evidence={requirement.evidence}
        canVerify={permissions.canConfirm && writable}
        onChanged={onChanged}
      />

      <RequirementFormModal
        open={editing}
        targetId={requirement.target.id}
        requirement={requirement}
        onClose={() => setEditing(false)}
        onSaved={onChanged}
      />

      {linking && <LinkTasksDialog requirement={requirement} onClose={() => setLinking(false)} onSaved={onChanged} />}
    </div>
  );
}

export function RequirementDetailModal({
  requirementId,
  onClose,
  onChanged,
}: {
  requirementId: string | null;
  onClose: () => void;
  /** Called after any mutation so the parent can refresh lists and readiness. */
  onChanged: () => void;
}) {
  const resource = useResource<RequirementDetail>(requirementId ? `/requirements/${requirementId}` : null);

  const changed = () => {
    resource.reload();
    onChanged();
  };

  return (
    <Dialog open={requirementId !== null} title="Chi tiết Requirement" onClose={onClose} wide>
      {requirementId && (
        <Async state={resource}>
          {(data) => <Body requirement={data} onChanged={changed} onClose={onClose} />}
        </Async>
      )}
    </Dialog>
  );
}
