import { useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type {
  EvidenceType,
  RequirementStatus,
  RequirementType,
  TaskStatus,
  VerificationResult,
} from '../api/types';
import {
  evidenceTypeLabel,
  initials,
  requirementStatusLabel,
  requirementStatusTone,
  requirementTypeLabel,
  requirementTypeTone,
  taskStatusLabel,
  taskStatusTone,
  verificationLabel,
  verificationTone,
} from '../lib/format';
import type { Tone } from '../lib/format';

/* ---------- Icon (Material Design Icons font, same as Nexum) ---------- */

export function Icon({ name, size, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <i
      className={`mdi mdi-${name} ${className}`}
      style={{ fontSize: size, lineHeight: 1, display: 'inline-flex' }}
      aria-hidden="true"
    />
  );
}

/* ---------- Button ---------- */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';
  size?: 'md' | 'sm';
  block?: boolean;
  icon?: string;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  icon,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size === 'sm' ? 'btn--sm' : '',
    block ? 'btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  );
}

/* ---------- Card ---------- */

export function Card({
  children,
  size,
  soft,
  hover,
  className = '',
  style,
  onClick,
}: {
  children: ReactNode;
  size?: 'sm';
  soft?: boolean;
  hover?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const classes = [
    'card',
    size === 'sm' ? 'card--sm' : '',
    soft ? 'card--soft' : '',
    hover ? 'card-hover' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

/* ---------- Badge ---------- */

export function Badge({ tone = 'neutral', children, icon }: { tone?: Tone; children: ReactNode; icon?: string }) {
  return (
    <span className={`badge ${tone === 'neutral' ? '' : `badge--${tone}`}`}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

export function RequirementStatusBadge({ status }: { status: RequirementStatus }) {
  return <Badge tone={requirementStatusTone[status]}>{requirementStatusLabel[status]}</Badge>;
}

export function RequirementTypeBadge({ type }: { type: RequirementType }) {
  return <Badge tone={requirementTypeTone[type]}>{requirementTypeLabel[type]}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={taskStatusTone[status]}>{taskStatusLabel[status]}</Badge>;
}

export function VerificationBadge({ result }: { result: VerificationResult }) {
  return <Badge tone={verificationTone[result]}>{verificationLabel[result]}</Badge>;
}

export function EvidenceTypeBadge({ type }: { type: EvidenceType }) {
  return <Badge tone="brand">{evidenceTypeLabel[type]}</Badge>;
}

export function TargetStatusBadge({ status }: { status: 'ACTIVE' | 'ARCHIVED' }) {
  return status === 'ACTIVE' ? (
    <Badge tone="healthy" icon="check-circle-outline">
      ACTIVE
    </Badge>
  ) : (
    <Badge tone="neutral" icon="archive-outline">
      ARCHIVED
    </Badge>
  );
}

/* ---------- Avatar ---------- */

export function Avatar({ name, small }: { name: string; small?: boolean }) {
  return <span className={`avatar ${small ? 'avatar--sm' : ''}`}>{initials(name)}</span>;
}

/* ---------- Form field ---------- */

export function Field({
  label,
  hint,
  required,
  full,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label className="field-label" htmlFor={id}>
        {label}
        {required && ' *'}
      </label>
      {children(id)}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

/* ---------- Dialog ---------- */

const dialogStack: string[] = [];

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const token = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    dialogStack.push(token);
    const onKey = (event: KeyboardEvent) => {
      // Only the top-most dialog reacts, so nested dialogs close one at a time.
      if (event.key === 'Escape' && dialogStack[dialogStack.length - 1] === token) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const index = dialogStack.indexOf(token);
      if (index >= 0) dialogStack.splice(index, 1);
    };
  }, [open, token]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`dialog ${wide ? 'dialog--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-header">
          <div>
            <h2 className="dialog-title">{title}</h2>
            {description && <p className="dialog-description">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={18} />
          </Button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (value: T) => void;
  tabs: { id: T; label: string; icon?: string; count?: number }[];
}) {
  return (
    <div className="tab-group" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          className={`tab-btn ${value === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <Icon name={tab.icon} size={15} />}
          {tab.label}
          {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Page header / states ---------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  crumbs,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  crumbs?: { label: string; to?: string }[];
}) {
  return (
    <div className="page-header-row">
      <header>
        {crumbs && (
          <nav className="breadcrumb" aria-label="Breadcrumb">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="row" style={{ gap: 6 }}>
                {index > 0 && <Icon name="chevron-right" size={14} />}
                {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </header>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon = 'inbox-outline',
  children,
  action,
}: {
  icon?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card soft className="empty">
      <Icon name={icon} />
      <p>{children}</p>
      {action}
    </Card>
  );
}

export function Loading({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return <div className="notice">{label}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="empty" style={{ borderColor: 'var(--color-critical)', background: 'var(--color-critical-bg)' }}>
      <Icon name="alert-circle-outline" />
      <p style={{ color: 'var(--color-critical)' }}>{message}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </Card>
  );
}

/** Renders loading / error placeholders, otherwise calls `children(data)`. */
export function Async<T>({
  state,
  children,
}: {
  state: { data?: T; error?: string; loading: boolean; reload: () => void };
  children: (data: T) => ReactNode;
}) {
  if (state.data !== undefined) return <>{children(state.data)}</>;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  return <Loading />;
}
