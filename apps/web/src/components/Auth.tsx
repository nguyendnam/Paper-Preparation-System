import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { api } from '../api/client';
import type { GroupRole, Me } from '../api/types';
import { LoginPage } from '../pages/LoginPage';
import { Loading } from './ui';

interface AuthValue {
  user: Me;
  /** Re-fetch /auth/me (e.g. after creating a group). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Highest-privilege role of the user across all groups (used only for UI hints). */
  hasRole: (role: GroupRole) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthGate>');
  return value;
}

type State = { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: Me };

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    try {
      const user = await api.get<Me>('/auth/me');
      setState({ status: 'authenticated', user });
    } catch {
      // 401 (no/expired session) or the API is unreachable: show the sign-in screen.
      setState({ status: 'anonymous' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === 'loading') return <Loading label="Đang kiểm tra phiên đăng nhập…" />;
  if (state.status === 'anonymous') return <LoginPage onAuthenticated={load} />;

  const { user } = state;

  return (
    <AuthContext.Provider
      value={{
        user,
        refresh: load,
        signOut: async () => {
          await api.post('/auth/logout');
          setState({ status: 'anonymous' });
        },
        hasRole: (role) => user.memberships.some((m) => m.role === role),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
