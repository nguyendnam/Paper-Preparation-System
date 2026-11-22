import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, errorMessage } from '../api/client';
import { Button, Card, Field, Icon, Tabs } from '../components/ui';

type Mode = 'login' | 'register';

export function LoginPage({ onAuthenticated }: { onAuthenticated: () => Promise<void> }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') {
        await api.post('/auth/login', { email, password });
      } else {
        await api.post('/auth/register', {
          email,
          password,
          displayName,
          groupName: groupName.trim() || undefined,
        });
      }
      await onAuthenticated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <Card style={{ width: '100%', maxWidth: 460, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'var(--color-brand)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Icon name="file-document-edit-outline" size={26} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Paper Preparation System</h1>
          <p className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
            Quản lý quá trình chuẩn bị bài báo gửi hội nghị cho nhóm tác giả.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Tabs<Mode>
            value={mode}
            onChange={(next) => {
              setMode(next);
              setError('');
            }}
            tabs={[
              { id: 'login', label: 'Đăng nhập' },
              { id: 'register', label: 'Tạo tài khoản' },
            ]}
          />
        </div>

        <form className="stack" onSubmit={(event) => void submit(event)}>
          {error && <div className="form-error">{error}</div>}

          {mode === 'register' && (
            <Field label="Họ và tên" required>
              {(id) => (
                <input
                  id={id}
                  className="input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  required
                />
              )}
            </Field>
          )}

          <Field label="Email" required>
            {(id) => (
              <input
                id={id}
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            )}
          </Field>

          <Field label="Mật khẩu" required hint={mode === 'register' ? 'Tối thiểu 8 ký tự.' : undefined}>
            {(id) => (
              <input
                id={id}
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'register' ? 8 : undefined}
                required
              />
            )}
          </Field>

          {mode === 'register' && (
            <Field
              label="Tên nhóm nghiên cứu mới"
              hint="Tùy chọn. Nếu nhập, bạn sẽ là Main Author của nhóm. Nếu bỏ trống, hãy nhờ Main Author thêm bạn vào nhóm theo email."
            >
              {(id) => (
                <input id={id} className="input" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              )}
            </Field>
          )}

          <Button type="submit" variant="primary" block disabled={busy}>
            {busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </Button>
        </form>

        {import.meta.env.DEV && (
          <p className="small muted" style={{ marginTop: 16, textAlign: 'center', lineHeight: 1.5 }}>
            Dữ liệu minh họa (sau khi chạy <code>pnpm db:seed</code>): <code>an@demo.local</code> / <code>Demo@12345</code>
          </p>
        )}
      </Card>
    </main>
  );
}
