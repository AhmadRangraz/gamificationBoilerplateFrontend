import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function StatusBadge({
  ready,
  children,
}: {
  ready: boolean;
  children: ReactNode;
}) {
  return (
    <span className="status-badge" data-ready={ready}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`ui-panel ${className}`}>{children}</section>;
}

export function PageHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="page-heading">
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

export function Button({
  children,
  className = '',
  tone = 'primary',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'quiet' | 'danger';
}) {
  return (
    <button
      className={`ui-button ${className}`}
      data-tone={tone}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p className="ui-field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Notice({
  error,
  children,
}: {
  error?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className="ui-notice"
      data-error={Boolean(error)}
      role={error ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}

export { ConfirmDialog } from './confirm-dialog';
