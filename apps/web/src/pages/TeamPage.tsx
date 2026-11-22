import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, errorMessage } from '../api/client';
import type { Group, GroupRole } from '../api/types';
import { useAuth } from '../components/Auth';
import { useToast } from '../components/Toast';
import { Async, Avatar, Badge, Button, Card, Dialog, EmptyState, Field, Icon, PageHeader } from '../components/ui';
import { formatDate, roleHint, roleLabel } from '../lib/format';
import { useResource } from '../lib/useResource';

const roles: GroupRole[] = ['MAIN_AUTHOR', 'CO_AUTHOR', 'VERIFIER', 'SUPERVISOR'];

function CreateGroupDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/groups', { name });
      onDone();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open title="Tạo nhóm nghiên cứu" description="Bạn sẽ là Main Author của nhóm mới." onClose={onClose}>
      <form className="stack" onSubmit={(e) => void submit(e)}>
        {error && <div className="form-error">{error}</div>}
        <Field label="Tên nhóm" required>
          {(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />}
        </Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'Đang tạo…' : 'Tạo nhóm'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function AddMemberDialog({ group, onClose, onDone }: { group: Group; onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<GroupRole>('CO_AUTHOR');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/groups/${group.id}/members`, { email, role });
      onDone();
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
      title={`Thêm thành viên vào “${group.name}”`}
      description="Thành viên cần có tài khoản trong hệ thống. Vai trò quyết định thao tác được phép."
      onClose={onClose}
    >
      <form className="stack" onSubmit={(e) => void submit(e)}>
        {error && <div className="form-error">{error}</div>}
        <Field label="Email" required>
          {(id) => (
            <input id={id} className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          )}
        </Field>
        <Field label="Vai trò" required hint={roleHint[role]}>
          {(id) => (
            <select id={id} className="input" value={role} onChange={(e) => setRole(e.target.value as GroupRole)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'Đang thêm…' : 'Thêm thành viên'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function TeamPage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const groups = useResource<Group[]>('/groups');
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState<Group | null>(null);

  const changed = () => {
    groups.reload();
    void refresh();
  };

  const changeRole = async (group: Group, userId: string, role: GroupRole) => {
    try {
      await api.patch(`/groups/${group.id}/members/${userId}`, { role });
      changed();
    } catch (err) {
      toast(errorMessage(err));
    }
  };

  const remove = async (group: Group, userId: string, name: string) => {
    const self = userId === user.id;
    if (!window.confirm(self ? `Rời nhóm “${group.name}”?` : `Xóa ${name} khỏi nhóm? Task đang mở của họ sẽ chuyển về chưa phân công.`)) return;
    try {
      await api.delete(`/groups/${group.id}/members/${userId}`);
      changed();
    } catch (err) {
      toast(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Nhóm"
        title="Nhóm nghiên cứu"
        description="Quyền truy cập dữ liệu bài báo được giới hạn theo thành viên nhóm. Bản thảo chưa công bố không được công khai mặc định."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
            Tạo nhóm
          </Button>
        }
      />

      <Async state={groups}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState icon="account-group-outline">Bạn chưa thuộc nhóm nào. Hãy tạo nhóm mới hoặc nhờ Main Author thêm bạn theo email.</EmptyState>
          ) : (
            <div className="stack">
              {items.map((group) => {
                const isMain = group.myRole === 'MAIN_AUTHOR';
                return (
                  <Card key={group.id}>
                    <div className="row-between" style={{ marginBottom: 16 }}>
                      <div>
                        <h2 className="section-title">{group.name}</h2>
                        <span className="small muted">
                          {group.members.length} thành viên · {group.paperCount} bài báo · vai trò của bạn: {roleLabel[group.myRole]}
                        </span>
                      </div>
                      {isMain && (
                        <Button icon="account-plus-outline" onClick={() => setAdding(group)}>
                          Thêm thành viên
                        </Button>
                      )}
                    </div>

                    <div className="list">
                      {group.members.map((m) => (
                        <div key={m.userId} className="card card--sm list-row">
                          <div className="row" style={{ flex: 1, minWidth: 0, flexWrap: 'nowrap' }}>
                            <Avatar name={m.displayName} />
                            <div className="row-main">
                              <span className="row-title">
                                {m.displayName} {m.userId === user.id && <Badge tone="brand">Bạn</Badge>}
                              </span>
                              <span className="row-sub">
                                {m.email} · tham gia {formatDate(m.joinedAt)}
                              </span>
                            </div>
                          </div>
                          <div className="row-side">
                            {isMain ? (
                              <select
                                className="input"
                                style={{ width: 'auto', minHeight: 32 }}
                                value={m.role}
                                onChange={(e) => void changeRole(group, m.userId, e.target.value as GroupRole)}
                                aria-label={`Vai trò của ${m.displayName}`}
                              >
                                {roles.map((r) => (
                                  <option key={r} value={r}>
                                    {roleLabel[r]}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Badge tone="brand">{roleLabel[m.role]}</Badge>
                            )}
                            {(isMain || m.userId === user.id) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={m.userId === user.id ? 'Rời nhóm' : `Xóa ${m.displayName}`}
                                onClick={() => void remove(group, m.userId, m.displayName)}
                              >
                                <Icon name={m.userId === user.id ? 'logout' : 'account-remove-outline'} size={16} />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="callout info" style={{ marginTop: 16 }}>
                      <strong>Vai trò:</strong>{' '}
                      {roles.map((r) => `${roleLabel[r]} — ${roleHint[r]}`).join(' · ')}
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        }
      </Async>

      {creating && <CreateGroupDialog onClose={() => setCreating(false)} onDone={changed} />}
      {adding && <AddMemberDialog group={adding} onClose={() => setAdding(null)} onDone={changed} />}
    </>
  );
}
