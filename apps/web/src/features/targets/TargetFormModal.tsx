import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, errorMessage } from '../../api/client';
import type { TargetDetail } from '../../api/types';
import { Button, Dialog } from '../../components/ui';
import { TargetFields } from './TargetFields';
import { emptyTargetForm, targetFormFrom, targetFormToBody } from './targetForm';
import type { TargetFormState } from './targetForm';

function Form({
  paperId,
  target,
  onClose,
  onSaved,
}: {
  paperId: string;
  target?: TargetDetail;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [form, setForm] = useState<TargetFormState>(target ? targetFormFrom(target) : emptyTargetForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = targetFormToBody(form);
      const result = target
        ? await api.patch<{ id: string }>(`/targets/${target.id}`, body)
        : await api.post<{ id: string }>(`/papers/${paperId}/targets`, body);
      onSaved(result.id);
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
      <TargetFields value={form} onChange={setForm} />
      <div className="callout info">
        Deadline phải dựa trên thông tin do hội nghị công bố hoặc cập nhật chính thức. Hãy ghi nguồn để nhóm kiểm tra lại khi cần.
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>
          Hủy
        </Button>
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? 'Đang lưu…' : target ? 'Lưu thay đổi' : 'Tạo Submission Target'}
        </Button>
      </div>
    </form>
  );
}

export function TargetFormModal({
  open,
  paperId,
  target,
  onClose,
  onSaved,
}: {
  open: boolean;
  paperId: string;
  target?: TargetDetail;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  return (
    <Dialog
      open={open}
      title={target ? 'Cập nhật Submission Target' : 'Tạo Submission Target'}
      description="Mục tiêu nộp bài cho một hội nghị cụ thể: kỳ tổ chức, track, CFP, hướng dẫn tác giả và các mốc deadline."
      onClose={onClose}
      wide
    >
      <Form paperId={paperId} target={target} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  );
}
