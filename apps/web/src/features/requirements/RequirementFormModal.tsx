import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, errorMessage } from '../../api/client';
import type { RequirementItem, RequirementSourceType, RequirementType } from '../../api/types';
import { Button, Dialog, Field } from '../../components/ui';
import { requirementTypeLabel, sourceTypeLabel } from '../../lib/format';


type Initial = Pick<
  RequirementItem,
  'description' | 'type' | 'sourceType' | 'sourceUrl' | 'sourceSection' | 'condition' | 'needsEvidence'
>;

function Form({
  targetId,
  requirement,
  defaultSourceUrl,
  onClose,
  onSaved,
}: {
  targetId: string;
  requirement?: Initial & { id: string };
  defaultSourceUrl?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(requirement);
  const [description, setDescription] = useState(requirement?.description ?? '');
  const [type, setType] = useState<RequirementType>(requirement?.type ?? 'MANDATORY');
  const [sourceType, setSourceType] = useState<RequirementSourceType>(requirement?.sourceType ?? 'CFP');
  const [sourceUrl, setSourceUrl] = useState(requirement?.sourceUrl ?? defaultSourceUrl ?? '');
  const [sourceSection, setSourceSection] = useState(requirement?.sourceSection ?? '');
  const [condition, setCondition] = useState(requirement?.condition ?? '');
  const [needsEvidence, setNeedsEvidence] = useState(requirement?.needsEvidence ?? false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    const body = {
      description,
      type,
      sourceType,
      sourceUrl: sourceUrl.trim() || null,
      sourceSection: sourceSection.trim() || null,
      condition: condition.trim() || null,
      needsEvidence,
    };

    try {
      if (requirement) await api.patch(`/requirements/${requirement.id}`, body);
      else await api.post(`/targets/${targetId}/requirements`, body);
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="stack">
      {error && <div className="form-error">{error}</div>}

      <div className="form-grid">
        <Field label="Nội dung yêu cầu" required full hint="Chép hoặc tóm tắt sát nội dung trong CFP / Author Guidelines.">
          {(id) => (
            <textarea
              id={id}
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              autoFocus
            />
          )}
        </Field>

        <Field label="Phân loại" required hint="Theo tài liệu của hội nghị.">
          {(id) => (
            <select id={id} className="input" value={type} onChange={(e) => setType(e.target.value as RequirementType)}>
              {(Object.keys(requirementTypeLabel) as RequirementType[]).map((t) => (
                <option key={t} value={t}>
                  {requirementTypeLabel[t]}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Loại nguồn" required>
          {(id) => (
            <select
              id={id}
              className="input"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as RequirementSourceType)}
            >
              {(Object.keys(sourceTypeLabel) as RequirementSourceType[]).map((t) => (
                <option key={t} value={t}>
                  {sourceTypeLabel[t]}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="URL nguồn">
          {(id) => (
            <input
              id={id}
              className="input"
              type="url"
              placeholder="https://"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          )}
        </Field>

        <Field label="Mục / trang nguồn">
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Ví dụ: Submission format, tr. 2"
              value={sourceSection}
              onChange={(e) => setSourceSection(e.target.value)}
            />
          )}
        </Field>

        <Field
          label="Điều kiện áp dụng"
          full
          hint="Để trống nếu áp dụng chung. Nếu chưa rõ track/loại bài, ghi “Cần rà soát” thay vì tự suy diễn."
        >
          {(id) => (
            <textarea id={id} className="input" rows={2} value={condition} onChange={(e) => setCondition(e.target.value)} />
          )}
        </Field>

        <label className="checkbox-row full">
          <input type="checkbox" checked={needsEvidence} onChange={(e) => setNeedsEvidence(e.target.checked)} />
          <span>
            <strong>Yêu cầu này cần lưu Evidence</strong>
            <span className="field-hint" style={{ display: 'block' }}>
              Nếu bật, Readiness View sẽ nêu rõ khi chưa có Evidence. Evidence không bắt buộc cho mọi yêu cầu.
            </span>
          </span>
        </label>
      </div>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>
          Hủy
        </Button>
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm Requirement'}
        </Button>
      </div>
    </form>
  );
}

export function RequirementFormModal({
  open,
  targetId,
  requirement,
  defaultSourceUrl,
  onClose,
  onSaved,
}: {
  open: boolean;
  targetId: string;
  requirement?: Initial & { id: string };
  defaultSourceUrl?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog
      open={open}
      title={requirement ? 'Chỉnh sửa Requirement' : 'Thêm Requirement'}
      description="Requirement thuộc về một Submission Target và nên truy xuất được về CFP hoặc Author Guidelines."
      onClose={onClose}
      wide
    >
      {/* Re-mounted on every open so the form always starts from the right values. */}
      <Form
        targetId={targetId}
        requirement={requirement}
        defaultSourceUrl={defaultSourceUrl}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Dialog>
  );
}
