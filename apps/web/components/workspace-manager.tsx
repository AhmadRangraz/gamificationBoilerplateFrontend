'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { components } from '@forge/api-client';
import { formatJalaliDate } from '@forge/shared';
import { Button, ConfirmDialog, Field, Notice, Panel } from '@forge/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ui } from '../lib/account-copy';
import { browserApi, runMutation } from '../lib/browser-api';

type Workspace = components['schemas']['WorkspaceResponse'];
const schema = z.object({
  name: z.string().trim().min(1, ui.required).max(160, ui.longValue),
  slug: z
    .string()
    .trim()
    .max(64, ui.longValue)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, ui.invalidSlug),
});
const empty = { name: '', slug: '' };

export function WorkspaceManager({ workspaces }: { workspaces: Workspace[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string>();
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: empty,
    resolver: zodResolver(schema),
  });

  function changeEditor(workspace?: Workspace) {
    setEditing(workspace?.id);
    setMessage(undefined);
    reset(workspace ? { name: workspace.name, slug: workspace.slug } : empty);
    if (workspace) document.getElementById('workspace-name')?.focus();
  }

  const save = handleSubmit(async (body) => {
    setMessage(undefined);
    const api = browserApi();
    const failure = await runMutation(() =>
      editing
        ? api.PATCH('/api/v1/workspaces/{id}', {
            params: { path: { id: editing } },
            body,
          })
        : api.POST('/api/v1/workspaces', { body }),
    );
    if (!failure) {
      changeEditor();
      router.refresh();
    }
    setMessage({ text: failure ?? ui.saved, error: Boolean(failure) });
  });

  async function remove(id: string) {
    setRemoving(true);
    setMessage(undefined);
    const failure = await runMutation(() =>
      browserApi().DELETE('/api/v1/workspaces/{id}', {
        params: { path: { id } },
      }),
    );
    if (!failure) {
      if (id === editing) changeEditor();
      router.refresh();
    }
    setMessage({ text: failure ?? ui.saved, error: Boolean(failure) });
    setRemoving(false);
    return failure;
  }

  return (
    <div className="workspace-grid">
      <Panel>
        <h2>{editing ? ui.editWorkspace : ui.newWorkspace}</h2>
        <form className="ui-form" onSubmit={save} noValidate>
          <Field
            id="workspace-name"
            label={ui.name}
            error={errors.name?.message}
          >
            <input
              id="workspace-name"
              className="ui-input"
              required
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={
                errors.name ? 'workspace-name-error' : undefined
              }
            />
          </Field>
          <Field
            id="workspace-slug"
            label={ui.slug}
            error={errors.slug?.message}
          >
            <input
              id="workspace-slug"
              className="ui-input"
              dir="ltr"
              spellCheck={false}
              required
              {...register('slug')}
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={
                errors.slug ? 'workspace-slug-error' : undefined
              }
            />
          </Field>
          <div className="action-row">
            <Button type="submit" disabled={isSubmitting || removing}>
              {isSubmitting ? ui.saving : ui.save}
            </Button>
            {editing && (
              <Button
                tone="quiet"
                onClick={() => changeEditor()}
                disabled={isSubmitting}
              >
                {ui.cancel}
              </Button>
            )}
          </div>
        </form>
      </Panel>
      <Panel>
        {message && <Notice error={message.error}>{message.text}</Notice>}
        {workspaces.length ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={ui.workspaces}
          >
            <table className="ui-table">
              <thead>
                <tr>
                  <th scope="col">{ui.name}</th>
                  <th scope="col">{ui.slug}</th>
                  <th scope="col">{ui.createdAt}</th>
                  <th scope="col">{ui.actions}</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((workspace) => (
                  <tr key={workspace.id}>
                    <th scope="row">{workspace.name}</th>
                    <td>
                      <bdi dir="ltr">{workspace.slug}</bdi>
                    </td>
                    <td>
                      <time dateTime={workspace.createdAt}>
                        {formatJalaliDate(new Date(workspace.createdAt))}
                      </time>
                    </td>
                    <td>
                      <div className="action-row">
                        <Button
                          tone="quiet"
                          onClick={() => changeEditor(workspace)}
                          disabled={isSubmitting || removing}
                        >
                          {ui.edit}
                        </Button>
                        <ConfirmDialog
                          label={ui.delete}
                          title={ui.confirmDelete}
                          description={workspace.name}
                          cancelLabel={ui.cancel}
                          disabled={isSubmitting || removing}
                          onConfirm={() => remove(workspace.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ui-hint">{ui.noWorkspaces}</p>
        )}
      </Panel>
    </div>
  );
}
