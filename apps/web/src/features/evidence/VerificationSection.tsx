import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, errorMessage } from '../../api/client';
import type { EvidenceItem, VerificationItem, VerificationResult } from '../../api/types';
import { Button, EmptyState, Field, VerificationBadge } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { evidenceTypeLabel, formatDateTime, verificationLabel } from '../../lib/format';

const results: VerificationResult[] = ['PASSED', 'NEEDS_REVISION', 'FAILED'];

export function VerificationSection({
  requirementId,
  items,
  evidence,
  canVerify,
  onChanged,
}: {
  requirementId: string;
  items: VerificationItem[];
  evidence: EvidenceItem[];
  canVerify: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<VerificationResult>('PASSED');
  const [note, setNote] = useState('');
  const [evidenceId, setEvidenceId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/requirements/${requirementId}/verifications`, {
        result,
        note: note || undefined,
        evidenceId: evidenceId || undefined,
      });
      toast('Đã ghi nhận Verification và cập nhật trạng thái Requirement.');
      setNote('');
      setEvidenceId('');
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="section-header-row">
        <h3 className="card-title" style={{ margin: 0 }}>
          Verification ({items.length})
        </h3>
        {canVerify && !open && (
          <Button size="sm" icon="clipboard-check-outline" onClick={() => setOpen(true)}>
            Ghi nhận Verification
          </Button>
        )}
      </div>

      {open && (
        <form className="card card--soft stack" style={{ marginBottom: 12 }} onSubmit={(e) => void submit(e)}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-info">
            “Đạt” sẽ chuyển Requirement sang <strong>Đã xác nhận đáp ứng</strong>. “Không đạt” hoặc “Cần chỉnh sửa” sẽ chuyển sang{' '}
            <strong>Cần xử lý</strong>. Người xác minh và thời điểm được lưu lại.
          </div>

          <div className="form-grid">
            <Field label="Kết quả kiểm tra" required>
              {(id) => (
                <select id={id} className="input" value={result} onChange={(e) => setResult(e.target.value as VerificationResult)}>
                  {results.map((r) => (
                    <option key={r} value={r}>
                      {verificationLabel[r]}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Evidence đã kiểm tra" hint="Tùy chọn.">
              {(id) => (
                <select id={id} className="input" value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)}>
                  <option value="">— Không chọn —</option>
                  {evidence.map((e) => (
                    <option key={e.id} value={e.id}>
                      {evidenceTypeLabel[e.type]}: {e.description.slice(0, 50)}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Ghi chú" full>
              {(id) => (
                <textarea
                  id={id}
                  className="input"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Đối chiếu giới hạn số trang theo CFP."
                />
              )}
            </Field>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Lưu Verification'}
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyState icon="clipboard-text-clock-outline">
          Chưa có Verification. Chỉ tạo khi yêu cầu cần kiểm tra chéo, có rủi ro hoặc nhóm muốn lưu quyết định xác minh.
        </EmptyState>
      ) : (
        <div className="timeline">
          {items.map((v) => (
            <div key={v.id} className="timeline-item">
              <div className="row">
                <VerificationBadge result={v.result} />
                <span className="small muted">
                  {v.verifier.displayName} · {formatDateTime(v.verifiedAt)}
                </span>
              </div>
              {v.note && <div style={{ marginTop: 4, lineHeight: 1.5 }}>{v.note}</div>}
              {v.evidence && (
                <div className="small muted" style={{ marginTop: 2 }}>
                  Evidence: {evidenceTypeLabel[v.evidence.type]} — {v.evidence.description.slice(0, 80)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
