import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, errorMessage } from '../../api/client';
import type { PaperAuthor, PaperDetail } from '../../api/types';
import { useAuth } from '../../components/Auth';
import { Button, Dialog, Field, Icon } from '../../components/ui';

interface AuthorRow {
  fullName: string;
  email: string;
  affiliation: string;
  isCorresponding: boolean;
}

const blankAuthor: AuthorRow = { fullName: '', email: '', affiliation: '', isCorresponding: false };

const toRow = (a: PaperAuthor): AuthorRow => ({
  fullName: a.fullName,
  email: a.email ?? '',
  affiliation: a.affiliation ?? '',
  isCorresponding: a.isCorresponding,
});

function Form({
  paper,
  onClose,
  onSaved,
}: {
  paper?: PaperDetail;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { user } = useAuth();
  const ownGroups = user.memberships.filter((m) => m.role === 'MAIN_AUTHOR');

  const [groupId, setGroupId] = useState(paper?.groupId ?? ownGroups[0]?.groupId ?? '');
  const [title, setTitle] = useState(paper?.title ?? '');
  const [abstract, setAbstract] = useState(paper?.abstract ?? '');
  const [researchArea, setResearchArea] = useState(paper?.researchArea ?? '');
  const [manuscriptUrl, setManuscriptUrl] = useState(paper?.manuscriptUrl ?? '');
  const [notes, setNotes] = useState(paper?.notes ?? '');
  const [authors, setAuthors] = useState<AuthorRow[]>(
    paper?.authors.length ? paper.authors.map(toRow) : [{ ...blankAuthor, fullName: user.displayName, email: user.email }],
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const updateAuthor = (index: number, patch: Partial<AuthorRow>) =>
    setAuthors((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    const body = {
      title,
      abstract: abstract.trim() || null,
      researchArea: researchArea.trim() || null,
      manuscriptUrl: manuscriptUrl.trim() || null,
      notes: notes.trim() || null,
      authors: authors
        .filter((a) => a.fullName.trim())
        .map((a) => ({
          fullName: a.fullName.trim(),
          email: a.email.trim() || null,
          affiliation: a.affiliation.trim() || null,
          isCorresponding: a.isCorresponding,
        })),
    };

    try {
      if (paper) {
        await api.patch(`/papers/${paper.id}`, body);
        onSaved(paper.id);
      } else {
        const created = await api.post<{ id: string }>('/papers', { ...body, groupId });
        onSaved(created.id);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!paper && ownGroups.length === 0) {
    return (
      <div className="stack">
        <div className="callout">
          Bạn cần là <strong>Main Author</strong> của một nhóm nghiên cứu để tạo bài báo. Hãy tạo nhóm mới ở mục “Nhóm nghiên cứu” hoặc nhờ
          Main Author thêm bạn.
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Đóng</Button>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={(e) => void submit(e)}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-grid">
        {!paper && (
          <Field label="Nhóm nghiên cứu" required full>
            {(id) => (
              <select id={id} className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                {ownGroups.map((m) => (
                  <option key={m.groupId} value={m.groupId}>
                    {m.groupName}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        <Field label="Tiêu đề bài báo" required full>
          {(id) => <input id={id} className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />}
        </Field>

        <Field label="Abstract" full>
          {(id) => <textarea id={id} className="input" rows={3} value={abstract} onChange={(e) => setAbstract(e.target.value)} />}
        </Field>

        <Field label="Lĩnh vực nghiên cứu">
          {(id) => <input id={id} className="input" value={researchArea} onChange={(e) => setResearchArea(e.target.value)} />}
        </Field>

        <Field label="Liên kết bản thảo" hint="Đường dẫn tới bản thảo trong công cụ hiện có (Overleaf, Drive, Git…). Hệ thống không lưu bản thảo.">
          {(id) => (
            <input
              id={id}
              className="input"
              type="url"
              placeholder="https://"
              value={manuscriptUrl}
              onChange={(e) => setManuscriptUrl(e.target.value)}
            />
          )}
        </Field>

        <Field label="Ghi chú" full>
          {(id) => <textarea id={id} className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </Field>
      </div>

      <section>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            Danh sách tác giả
          </h3>
          <Button size="sm" icon="plus" onClick={() => setAuthors((rows) => [...rows, { ...blankAuthor }])}>
            Thêm tác giả
          </Button>
        </div>
        <div className="stack-sm">
          {authors.map((author, index) => (
            <div key={index} className="card card--sm">
              <div className="form-grid">
                <input
                  className="input"
                  placeholder="Họ và tên"
                  aria-label={`Tác giả ${index + 1}: họ và tên`}
                  value={author.fullName}
                  onChange={(e) => updateAuthor(index, { fullName: e.target.value })}
                />
                <input
                  className="input"
                  type="email"
                  placeholder="Email"
                  aria-label={`Tác giả ${index + 1}: email`}
                  value={author.email}
                  onChange={(e) => updateAuthor(index, { email: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Đơn vị"
                  aria-label={`Tác giả ${index + 1}: đơn vị`}
                  value={author.affiliation}
                  onChange={(e) => updateAuthor(index, { affiliation: e.target.value })}
                />
                <div className="row-between">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={author.isCorresponding}
                      onChange={(e) => updateAuthor(index, { isCorresponding: e.target.checked })}
                    />
                    <span className="small">Tác giả liên hệ</span>
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Xóa tác giả"
                    onClick={() => setAuthors((rows) => rows.filter((_, i) => i !== index))}
                  >
                    <Icon name="trash-can-outline" size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>
          Hủy
        </Button>
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? 'Đang lưu…' : paper ? 'Lưu thay đổi' : 'Tạo bài báo'}
        </Button>
      </div>
    </form>
  );
}

export function PaperFormModal({
  open,
  paper,
  onClose,
  onSaved,
}: {
  open: boolean;
  paper?: PaperDetail;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  return (
    <Dialog
      open={open}
      title={paper ? 'Cập nhật bài báo' : 'Tạo bài báo mới'}
      description="Hồ sơ Paper chỉ lưu thông tin thư mục tối thiểu và tham chiếu tới bản thảo; không thay thế công cụ soạn thảo."
      onClose={onClose}
      wide
    >
      <Form paper={paper} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  );
}
