import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, errorMessage } from '../../api/client';
import type { EvidenceItem, EvidenceType } from '../../api/types';
import { Button, EmptyState, EvidenceTypeBadge, Field, Icon } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { evidenceTypeLabel, formatDateTime } from '../../lib/format';

const typeOptions: EvidenceType[] = ['NOTE', 'URL', 'VERSION_REFERENCE', 'FILE'];

const typeHint: Record<EvidenceType, string> = {
  NOTE: 'Ghi chú tự do, ví dụ: “Bản thảo hiện có 8 trang, đã tính cả tài liệu tham khảo”.',
  URL: 'Đường dẫn tới bản thảo hoặc thư mục chứa tài liệu (không cần tải lại nội dung).',
  VERSION_REFERENCE: 'Tên tệp, số phiên bản hoặc ngày cập nhật để xác định căn cứ đang nói tới.',
  FILE: 'Chỉ lưu tên tệp và vị trí lưu trữ ngoài hệ thống; hệ thống không tải tệp lên.',
};

export function EvidenceSection({
  requirementId,
  items,
  canAdd,
  canDelete,
  onChanged,
}: {
  requirementId: string;
  items: EvidenceItem[];
  canAdd: boolean;
  canDelete: (item: EvidenceItem) => boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<EvidenceType>('NOTE');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [versionReference, setVersionReference] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setType('NOTE');
    setDescription('');
    setSourceUrl('');
    setFileName('');
    setFilePath('');
    setVersionReference('');
    setError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/requirements/${requirementId}/evidence`, {
        type,
        description,
        sourceUrl: sourceUrl || undefined,
        fileName: type === 'FILE' ? fileName || undefined : undefined,
        filePath: type === 'FILE' ? filePath || undefined : undefined,
        versionReference: versionReference || undefined,
      });
      toast('Đã ghi nhận Evidence. Trạng thái Requirement không tự thay đổi.');
      reset();
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: EvidenceItem) => {
    if (!window.confirm('Xóa Evidence này?')) return;
    try {
      await api.delete(`/evidence/${item.id}`);
      onChanged();
    } catch (err) {
      toast(errorMessage(err));
    }
  };

  return (
    <section>
      <div className="section-header-row">
        <h3 className="card-title" style={{ margin: 0 }}>
          Evidence ({items.length})
        </h3>
        {canAdd && !open && (
          <Button size="sm" icon="plus" onClick={() => setOpen(true)}>
            Thêm Evidence
          </Button>
        )}
      </div>

      {open && (
        <form className="card card--soft stack" style={{ marginBottom: 12 }} onSubmit={(e) => void submit(e)}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            <Field label="Loại Evidence" required>
              {(id) => (
                <select id={id} className="input" value={type} onChange={(e) => setType(e.target.value as EvidenceType)}>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {evidenceTypeLabel[t]}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <div className="field-hint" style={{ alignSelf: 'end', paddingBottom: 8 }}>
              {typeHint[type]}
            </div>

            <Field label="Mô tả" required full>
              {(id) => (
                <textarea
                  id={id}
                  className="input"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              )}
            </Field>

            {(type === 'URL' || type === 'VERSION_REFERENCE') && (
              <Field label={type === 'URL' ? 'Đường dẫn' : 'Đường dẫn (nếu có)'} required={type === 'URL'} full>
                {(id) => (
                  <input
                    id={id}
                    className="input"
                    type="url"
                    placeholder="https://"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    required={type === 'URL'}
                  />
                )}
              </Field>
            )}

            {type === 'VERSION_REFERENCE' && (
              <Field label="Tham chiếu phiên bản" required full hint="Ví dụ: draft-v7.pdf, v3, cập nhật 12/05.">
                {(id) => (
                  <input
                    id={id}
                    className="input"
                    value={versionReference}
                    onChange={(e) => setVersionReference(e.target.value)}
                    required
                  />
                )}
              </Field>
            )}

            {type === 'FILE' && (
              <>
                <Field label="Tên tệp" required>
                  {(id) => (
                    <input id={id} className="input" value={fileName} onChange={(e) => setFileName(e.target.value)} required />
                  )}
                </Field>
                <Field label="Vị trí lưu trữ" hint="Đường dẫn thư mục/Drive nơi tệp đang được lưu.">
                  {(id) => (
                    <input id={id} className="input" value={filePath} onChange={(e) => setFilePath(e.target.value)} />
                  )}
                </Field>
              </>
            )}
          </div>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Hủy
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Lưu Evidence'}
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyState icon="paperclip">
          Chưa có Evidence. Evidence không bắt buộc cho mọi Requirement — chỉ thêm khi nhóm cần lưu căn cứ.
        </EmptyState>
      ) : (
        <div className="list">
          {items.map((item) => (
            <div key={item.id} className="card card--sm">
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div className="row-main">
                  <div className="row" style={{ marginBottom: 4 }}>
                    <EvidenceTypeBadge type={item.type} />
                    {item.versionReference && (
                      <span className="small muted">
                        <Icon name="source-branch" size={12} /> {item.versionReference}
                      </span>
                    )}
                  </div>
                  <div style={{ lineHeight: 1.5 }}>{item.description}</div>
                  {item.sourceUrl && (
                    <a className="link small" href={item.sourceUrl} target="_blank" rel="noreferrer noopener">
                      {item.sourceUrl}
                    </a>
                  )}
                  {item.fileName && (
                    <div className="small muted">
                      <Icon name="file-outline" size={12} /> {item.fileName}
                      {item.filePath ? ` — ${item.filePath}` : ''}
                    </div>
                  )}
                  <div className="row-sub">
                    {item.createdBy.displayName} · {formatDateTime(item.createdAt)}
                  </div>
                </div>
                {canDelete(item) && (
                  <Button size="sm" variant="ghost" onClick={() => void remove(item)} aria-label="Xóa Evidence">
                    <Icon name="trash-can-outline" size={16} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
