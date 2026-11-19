'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, Notice, Panel, StatusBadge } from '@forge/ui';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Account } from '../lib/accounts';
import { ui } from '../lib/account-copy';
import { browserApi, runMutation } from '../lib/browser-api';

const profileSchema = z.object({
  name: z.string().trim().min(1, ui.required).max(100, ui.longValue),
});
type Message = { text: string; error: boolean };

export function ProfileForm({ account }: { account: Account }) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>();
  const [verification, setVerification] = useState<Message>();
  const [sending, setSending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { name: account.name },
    resolver: zodResolver(profileSchema),
  });

  const save = handleSubmit(async (body) => {
    setMessage(undefined);
    const failure = await runMutation(() =>
      browserApi().PATCH('/api/v1/auth/me', { body }),
    );
    setMessage({ text: failure ?? ui.saved, error: Boolean(failure) });
    if (!failure) router.refresh();
  });

  async function requestVerification() {
    setSending(true);
    setVerification(undefined);
    const failure = await runMutation(() =>
      browserApi().POST('/api/v1/auth/email/request'),
    );
    setVerification({
      text: failure ?? ui.verifyRequested,
      error: Boolean(failure),
    });
    setSending(false);
  }

  return (
    <>
      <Panel>
        <div className="profile-identity">
          <div>
            <p>{ui.email}</p>
            <bdi dir="ltr">{account.email}</bdi>
          </div>
          <StatusBadge ready={account.emailVerified}>
            {account.emailVerified ? ui.emailVerified : ui.emailPending}
          </StatusBadge>
        </div>
        <form className="ui-form" onSubmit={save} noValidate>
          <Field id="profile-name" label={ui.name} error={errors.name?.message}>
            <input
              id="profile-name"
              className="ui-input"
              autoComplete="name"
              required
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'profile-name-error' : undefined}
            />
          </Field>
          {message && <Notice error={message.error}>{message.text}</Notice>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? ui.saving : ui.save}
          </Button>
        </form>
        {!account.emailVerified && (
          <div className="verification">
            <div className="action-row">
              <Button
                tone="quiet"
                onClick={requestVerification}
                disabled={sending}
              >
                {sending ? ui.saving : ui.requestCode}
              </Button>
              <Link href="/auth/verify">{ui.haveCode}</Link>
            </div>
            {verification && (
              <Notice error={verification.error}>{verification.text}</Notice>
            )}
          </div>
        )}
      </Panel>
      <AvatarForm name={account.name} />
    </>
  );
}

function AvatarForm({ name }: { name: string }) {
  const [version, setVersion] = useState(0);
  const [loadedVersion, setLoadedVersion] = useState(-1);
  const [selected, setSelected] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>();

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    const file = selected;
    if (
      !file ||
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 48 * 1024
    ) {
      setMessage({ text: ui.invalidImage, error: true });
      return;
    }
    const form = event.currentTarget;
    setBusy(true);
    const error = await runMutation(async () => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const image = btoa(
        Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''),
      );
      return browserApi().PUT('/api/v1/auth/me/avatar', { body: { image } });
    });
    if (!error) {
      setVersion((current) => current + 1);
      setSelected(undefined);
      form.reset();
    }
    setMessage({ text: error ?? ui.saved, error: Boolean(error) });
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    const error = await runMutation(() =>
      browserApi().DELETE('/api/v1/auth/me/avatar'),
    );
    if (!error) {
      setLoadedVersion(-1);
      setVersion((current) => current + 1);
    }
    setMessage({ text: error ?? ui.saved, error: Boolean(error) });
    setBusy(false);
  }

  return (
    <Panel>
      <h2>{ui.avatar}</h2>
      <div className="avatar-display">
        <span aria-hidden="true">{Array.from(name.trim())[0]}</span>
        <Image
          key={version}
          unoptimized
          src={`/api/v1/auth/me/avatar?v=${version}`}
          alt={ui.avatar}
          width={76}
          height={76}
          className={
            loadedVersion === version ? 'avatar-loaded' : 'avatar-unloaded'
          }
          onLoad={() => setLoadedVersion(version)}
        />
      </div>
      <form className="ui-form" onSubmit={upload}>
        <Field id="avatar-file" label={ui.chooseAvatar}>
          <input
            id="avatar-file"
            className="ui-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-describedby="avatar-hint"
            onChange={(event) => setSelected(event.target.files?.[0])}
          />
        </Field>
        <p className="ui-hint" id="avatar-hint">
          {ui.avatarHint}
        </p>
        {message && <Notice error={message.error}>{message.text}</Notice>}
        <div className="action-row">
          <Button type="submit" disabled={busy || !selected}>
            {ui.uploadAvatar}
          </Button>
          {loadedVersion === version && (
            <Button tone="quiet" disabled={busy} onClick={remove}>
              {ui.removeAvatar}
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
