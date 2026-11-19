'use client';

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState } from 'react';

export function ConfirmDialog({
  label,
  title,
  description,
  cancelLabel,
  disabled,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  cancelLabel: string;
  disabled?: boolean;
  onConfirm: () => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function confirm() {
    setPending(true);
    const failure = await onConfirm();
    setPending(false);
    setError(failure ?? undefined);
    if (!failure) setOpen(false);
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(value) => {
        if (pending) return;
        setError(undefined);
        setOpen(value);
      }}
    >
      <AlertDialog.Trigger
        className="ui-button"
        data-tone="quiet"
        disabled={disabled}
      >
        {label}
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="ui-panel dialog-content">
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description className="ui-hint">
            {description}
          </AlertDialog.Description>
          {error && (
            <p className="ui-notice" data-error role="alert">
              {error}
            </p>
          )}
          <div className="action-row">
            <AlertDialog.Cancel
              className="ui-button"
              data-tone="quiet"
              disabled={pending}
            >
              {cancelLabel}
            </AlertDialog.Cancel>
            <button
              className="ui-button"
              data-tone="danger"
              type="button"
              disabled={pending}
              onClick={confirm}
            >
              {label}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
