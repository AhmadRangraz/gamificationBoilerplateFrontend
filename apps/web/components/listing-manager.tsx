'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, ConfirmDialog, Field, Notice, Panel } from '@forge/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ui } from '../lib/account-copy';
import { browserApi, runMutation } from '../lib/browser-api';
import { market } from '../lib/market-copy';
import type { Listing } from '../lib/marketplace';

function normalizePrice(value: string) {
  return value
    .trim()
    .replace(/[۰-۹٠-٩]/g, (digit) => String(digit.charCodeAt(0) % 16));
}

const schema = z.object({
  title: z.string().trim().min(1, ui.required).max(100, ui.longValue),
  description: z.string().trim().min(1, ui.required).max(1200, ui.longValue),
  category: z.enum(['HANDMADE', 'BOOKS', 'ELECTRONICS']),
  price: z
    .string()
    .transform(normalizePrice)
    .refine(
      (value) => /^\d{1,10}$/.test(value) && Number(value) <= 1_000_000_000,
      market.invalidPrice,
    )
    .transform(Number),
});

const empty: z.input<typeof schema> = {
  title: '',
  description: '',
  category: 'HANDMADE',
  price: '',
};

export function ListingManager({ listings }: { listings: Listing[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string>();
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    defaultValues: empty,
    resolver: zodResolver(schema),
  });
  function edit(item?: Listing) {
    setEditing(item?.id);
    reset(
      item
        ? {
            title: item.title,
            description: item.description,
            category: item.category,
            price: String(item.price),
          }
        : empty,
    );
    setMessage(undefined);
    if (item) document.getElementById('listing-title')?.focus();
  }

  const save = handleSubmit(async (body) => {
    setMessage(undefined);
    const api = browserApi();
    const failure = await runMutation(() =>
      editing
        ? api.PATCH('/api/v1/marketplace/listings/{id}', {
            params: { path: { id: editing } },
            body,
          })
        : api.POST('/api/v1/marketplace/listings', { body }),
    );
    if (!failure) {
      edit();
      router.refresh();
    }
    setMessage({ text: failure ?? ui.saved, error: Boolean(failure) });
  });

  async function remove(id: string) {
    const failure = await runMutation(() =>
      browserApi().DELETE('/api/v1/marketplace/listings/{id}', {
        params: { path: { id } },
      }),
    );
    if (!failure) {
      if (editing === id) edit();
      setMessage({ text: ui.saved, error: false });
      router.refresh();
    }
    return failure;
  }

  return (
    <div className="workspace-grid">
      <Panel>
        <h2>{editing ? market.editListing : market.newListing}</h2>
        <form className="ui-form" noValidate onSubmit={save}>
          <Field
            id="listing-title"
            label={market.titleField}
            error={errors.title?.message}
          >
            <input
              id="listing-title"
              className="ui-input"
              required
              aria-invalid={Boolean(errors.title)}
              aria-describedby={
                errors.title ? 'listing-title-error' : undefined
              }
              {...register('title')}
            />
          </Field>
          <Field
            id="listing-description"
            label={market.descriptionField}
            error={errors.description?.message}
          >
            <textarea
              id="listing-description"
              className="ui-input"
              rows={4}
              required
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? 'listing-description-error' : undefined
              }
              {...register('description')}
            />
          </Field>
          <Field id="listing-category" label={market.category}>
            <select
              id="listing-category"
              className="ui-input"
              {...register('category')}
            >
              {Object.entries(market.categories).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="listing-price"
            label={market.price}
            error={errors.price?.message}
          >
            <input
              id="listing-price"
              className="ui-input"
              dir="ltr"
              inputMode="numeric"
              required
              aria-invalid={Boolean(errors.price)}
              aria-describedby={
                errors.price ? 'listing-price-error' : undefined
              }
              {...register('price')}
            />
          </Field>
          {message && <Notice error={message.error}>{message.text}</Notice>}
          <div className="action-row">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? ui.saving : ui.save}
            </Button>
            {editing && (
              <Button tone="quiet" onClick={() => edit()}>
                {ui.cancel}
              </Button>
            )}
          </div>
        </form>
      </Panel>
      <Panel>
        <h2>{market.mine}</h2>
        {listings.length ? (
          <ul className="market-owned">
            {listings.map((item) => (
              <li key={item.id}>
                <Link href={`/marketplace/${item.id}`}>{item.title}</Link>
                <div className="action-row">
                  <Button
                    tone="quiet"
                    disabled={isSubmitting}
                    onClick={() => edit(item)}
                  >
                    {market.edit}
                  </Button>
                  <ConfirmDialog
                    label={ui.delete}
                    title={market.deleteQuestion}
                    description={item.title}
                    cancelLabel={ui.cancel}
                    disabled={isSubmitting}
                    onConfirm={() => remove(item.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ui-hint">{market.empty}</p>
        )}
      </Panel>
    </div>
  );
}
