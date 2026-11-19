'use client';

import { Button, Field, Notice, Panel } from '@forge/ui';
import { useRef, useState, type FormEvent } from 'react';
import { ui } from '../lib/account-copy';
import { apiError, browserApi } from '../lib/browser-api';
import { progressCopy as copy } from '../lib/progress-copy';

export function PointAdjustment({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const retry = useRef<{ requestId: string; points: number; reason: string }>(
    undefined,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const amount = String(fields.get('points') ?? '')
      .trim()
      .replace(/[۰-۹٠-٩]/g, (digit) => String(digit.charCodeAt(0) % 16));
    const points = Number(amount);
    const reason = String(fields.get('reason') ?? '').trim();
    if (!/^-?\d+$/.test(amount) || !points || Math.abs(points) > 1000) {
      setMessage({ text: copy.invalidAdjustment, error: true });
      return;
    }
    if (!reason || reason.length > 240) {
      setMessage({ text: ui.badRequest, error: true });
      return;
    }
    if (
      !retry.current ||
      retry.current.points !== points ||
      retry.current.reason !== reason
    ) {
      retry.current = { requestId: crypto.randomUUID(), points, reason };
    }

    setPending(true);
    setMessage(undefined);
    try {
      const { response } = await browserApi().POST(
        '/api/v1/gamification/accounts/{id}/adjustments',
        {
          params: { path: { id } },
          body: retry.current,
        },
      );
      if (response.ok) {
        retry.current = undefined;
        form.reset();
        setMessage({ text: ui.saved, error: false });
      } else {
        setMessage({
          text:
            response.status === 409
              ? copy.adjustmentConflict
              : apiError(response.status),
          error: true,
        });
      }
    } catch {
      setMessage({ text: ui.retry, error: true });
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel>
      <form className="ui-form" onSubmit={submit}>
        <Field id="adjustment-points" label={copy.adjustmentAmount}>
          <input
            required
            className="ui-input"
            id="adjustment-points"
            name="points"
            dir="ltr"
            maxLength={6}
          />
        </Field>
        <Field id="adjustment-reason" label={copy.reason}>
          <textarea
            required
            className="ui-input"
            id="adjustment-reason"
            name="reason"
            rows={3}
            maxLength={240}
          />
        </Field>
        {message && <Notice error={message.error}>{message.text}</Notice>}
        <Button type="submit" disabled={pending}>
          {pending ? ui.saving : ui.save}
        </Button>
      </form>
    </Panel>
  );
}
