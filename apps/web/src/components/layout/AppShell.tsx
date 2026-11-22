import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../Auth';
import { Avatar, Badge, Icon } from '../ui';
import { roleLabel } from '../../lib/format';

const navigation = [
  { to: '/', label: 'Tổng quan', icon: 'view-dashboard-outline' },
  { to: '/papers', label: 'Bài báo', icon: 'book-open-page-variant-outline' },
  { to: '/tasks', label: 'Công việc của tôi', icon: 'clipboard-text-outline' },
  { to: '/history', label: 'Lịch sử mục tiêu', icon: 'history' },
  { to: '/team', label: 'Nhóm nghiên cứu', icon: 'account-group-outline' },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const primaryRole = user.memberships[0]?.role;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="file-document-edit-outline" size={20} />
          </span>
          <div>
            <div className="brand-name">Paper Preparation</div>
            <div className="brand-sub">Submission readiness</div>
          </div>
        </div>

        <nav aria-label="Điều hướng chính">
          <div className="nav-section-label">Workspace</div>
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-note">
          <strong>Bổ trợ công cụ hiện có</strong>
          Bản thảo vẫn được soạn bằng công cụ của nhóm. Hệ thống chỉ lưu tham chiếu, yêu cầu của hội nghị và tình trạng chuẩn bị.
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <Icon name="domain" size={16} />
            <span>
              {user.memberships.length > 0
                ? user.memberships.map((m) => m.groupName).join(' · ')
                : 'Chưa thuộc nhóm nghiên cứu nào'}
            </span>
          </div>

          <div className="user-menu" ref={menuRef}>
            <button
              type="button"
              className="user-trigger"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar name={user.displayName} />
              <div className="user-meta">
                <strong>{user.displayName}</strong>
                <span>{primaryRole ? roleLabel[primaryRole] : user.email}</span>
              </div>
              <Icon name="chevron-down" size={16} />
            </button>

            {menuOpen && (
              <div className="user-dropdown" role="menu">
                <div style={{ padding: '8px 12px' }}>
                  <div className="small muted">{user.email}</div>
                  <div className="row" style={{ marginTop: 6 }}>
                    {user.memberships.map((m) => (
                      <Badge key={m.groupId} tone="brand">
                        {roleLabel[m.role]}
                      </Badge>
                    ))}
                  </div>
                </div>
                <button type="button" className="danger" role="menuitem" onClick={() => void signOut()}>
                  <Icon name="logout" size={18} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
