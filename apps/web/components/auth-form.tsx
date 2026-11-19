'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, Notice } from '@forge/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ui } from '../lib/account-copy';
import { browserApi, runMutation } from '../lib/browser-api';

const validators = {
  email: z.string().trim().email(ui.invalidEmail).max(254, ui.longValue),
  password: z.string().min(12, ui.shortPassword).max(128, ui.longValue),
  name: z.string().trim().min(1, ui.required).max(100, ui.longValue),
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{43}$/, ui.invalidCode),
};

const fields = {
  login: ['email', 'password'],
  register: ['name', 'email', 'password'],
  recover: ['email'],
  reset: ['code', 'password'],
  verify: ['code'],
} as const;

export type AuthFlow = keyof typeof fields;

const labels = {
  name: ui.name,
  email: ui.email,
  code: ui.code,
  password: ui.password,
};
const actions = {
  login: ui.login,
  register: ui.register,
  recover: ui.recover,
  reset: ui.reset,
  verify: ui.verify,
};
const success = {
  recover: ui.resetRequested,
  reset: ui.resetDone,
  verify: ui.verifyDone,
};

export function AuthForm({ flow }: { flow: AuthFlow }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const schema = z
    .object({
      name: z.string(),
      email: z.string(),
      password: z.string(),
      code: z.string(),
    })
    .superRefine((input, ctx) => {
      for (const field of fields[flow]) {
        const result = validators[field].safeParse(input[field]);
        const issue = result.error?.issues[0];
        if (issue)
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: issue.message,
          });
      }
    });
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: { name: '', email: '', password: '', code: '' },
    resolver: zodResolver(schema),
  });

  const submit = handleSubmit(async (input) => {
    setMessage(undefined);
    const email = input.email.trim();
    const code = input.code.trim();
    const password = input.password;
    const api = browserApi();
    const error = await runMutation(() => {
      switch (flow) {
        case 'login':
          return api.POST('/api/v1/auth/login', { body: { email, password } });
        case 'register':
          return api.POST('/api/v1/auth/register', {
            body: { email, password, name: input.name.trim() },
          });
        case 'recover':
          return api.POST('/api/v1/auth/password/request', { body: { email } });
        case 'reset':
          return api.POST('/api/v1/auth/password/reset', {
            body: { code, password },
          });
        case 'verify':
          return api.POST('/api/v1/auth/email/verify', { body: { code } });
      }
    });
    if (error) {
      setMessage({ text: error, error: true });
      return;
    }
    if (flow === 'login' || flow === 'register') {
      router.replace('/account');
      router.refresh();
    } else {
      setMessage({ text: success[flow], error: false });
      reset();
      router.refresh();
    }
  });

  return (
    <>
      <form className="ui-form" noValidate onSubmit={submit}>
        {fields[flow].map((field) => {
          const error = errors[field]?.message;
          const id = `auth-${field}`;
          return (
            <Field key={field} id={id} label={labels[field]} error={error}>
              <input
                id={id}
                className="ui-input"
                dir={field === 'name' ? 'rtl' : 'ltr'}
                type={
                  field === 'email' || field === 'password' ? field : 'text'
                }
                autoComplete={
                  field === 'code'
                    ? 'one-time-code'
                    : field === 'password'
                      ? flow === 'login'
                        ? 'current-password'
                        : 'new-password'
                      : field
                }
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                {...register(field)}
              />
            </Field>
          );
        })}
        {message && <Notice error={message.error}>{message.text}</Notice>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? ui.saving : actions[flow]}
        </Button>
      </form>
      <div className="auth-links">
        {flow !== 'login' && <Link href="/auth/login">{ui.login}</Link>}
        {flow === 'login' && (
          <>
            <Link href="/auth/register">{ui.register}</Link>
            <Link href="/auth/recover">{ui.recover}</Link>
          </>
        )}
        {flow === 'recover' && <Link href="/auth/reset">{ui.haveCode}</Link>}
        {flow === 'verify' && <Link href="/account">{ui.account}</Link>}
      </div>
    </>
  );
}
