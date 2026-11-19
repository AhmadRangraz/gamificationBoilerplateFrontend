'use client';

import { Button, Notice, Panel, StatusBadge } from '@forge/ui';
import Link from 'next/link';
import { progressCopy } from '../lib/progress-copy';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Account } from '../lib/accounts';
import { ui } from '../lib/account-copy';
import { browserApi, runMutation } from '../lib/browser-api';

export function AccountsTable({
  accounts,
  gamification,
}: {
  accounts: Account[];
  gamification: boolean;
}) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string>();
  const [status, setStatus] = useState<{ text: string; error: boolean }>();
  const router = useRouter();
  const normalized = query.trim().toLowerCase();
  const visible = accounts.filter(({ name, email }) =>
    [name.toLowerCase(), email].some((value) => value.includes(normalized)),
  );

  async function update(account: Account) {
    setBusy(account.id);
    setStatus(undefined);
    const failure = await runMutation(() =>
      browserApi().PATCH('/api/v1/auth/accounts/{id}/status', {
        params: { path: { id: account.id } },
        body: { suspended: !account.suspendedAt },
      }),
    );
    setStatus({ text: failure ?? ui.saved, error: Boolean(failure) });
    if (!failure) router.refresh();
    setBusy(undefined);
  }

  return (
    <Panel>
      <div className="table-tools">
        <label htmlFor="account-search">{ui.search}</label>
        <input
          className="ui-input"
          id="account-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {status && <Notice error={status.error}>{status.text}</Notice>}
      {visible.length ? (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label={ui.admin}
        >
          <table className="ui-table">
            <thead>
              <tr>
                <th scope="col">{ui.name}</th>
                <th scope="col">{ui.email}</th>
                <th scope="col">{ui.role}</th>
                <th scope="col">{ui.status}</th>
                <th scope="col">{ui.actions}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((account) => (
                <tr key={account.id}>
                  <th scope="row">{account.name}</th>
                  <td>
                    <bdi dir="ltr">{account.email}</bdi>
                  </td>
                  <td>
                    {account.role === 'ADMIN' ? ui.administrator : ui.member}
                  </td>
                  <td>
                    <StatusBadge ready={!account.suspendedAt}>
                      {account.suspendedAt ? ui.suspended : ui.active}
                    </StatusBadge>
                  </td>
                  <td>
                    <div className="action-row">
                      {account.role === 'MEMBER' && (
                        <Button
                          tone="quiet"
                          disabled={Boolean(busy)}
                          onClick={() => update(account)}
                        >
                          {account.suspendedAt ? ui.restore : ui.suspend}
                        </Button>
                      )}
                      {gamification &&
                        account.role === 'MEMBER' &&
                        !account.suspendedAt && (
                          <Link
                            className="status-link"
                            href={`/admin/points/${account.id}`}
                          >
                            {progressCopy.adjust}
                          </Link>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="ui-hint">{ui.noAccounts}</p>
      )}
    </Panel>
  );
}
