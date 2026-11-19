import { forgeConfig } from '@forge/config';
import { notFound } from 'next/navigation';
import { formatNumber } from '@forge/shared';
import { PageHeading } from '@forge/ui';
import Link from 'next/link';
import { WorkspaceManager } from '../../../components/workspace-manager';
import { ui } from '../../../lib/account-copy';
import { listWorkspaces, requireAccount } from '../../../lib/accounts';

export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  if (!forgeConfig.features.workspaceAdmin) notFound();
  await requireAccount(true);
  const { page } = await searchParams;
  const value =
    typeof page === 'string' && /^\d{1,3}$/.test(page) ? Number(page) : 1;
  const current = Math.max(1, Math.min(500, value));
  const { items, hasNext } = await listWorkspaces(current);

  return (
    <>
      <PageHeading
        title={ui.workspaces}
        description={ui.workspaceDescription}
      />
      <WorkspaceManager workspaces={items} />
      {(current > 1 || hasNext) && (
        <nav className="pager" aria-label={ui.pager}>
          {current > 1 && (
            <Link href={`?page=${current - 1}`}>{ui.previous}</Link>
          )}
          <span aria-current="page">{formatNumber(current)}</span>
          {hasNext && <Link href={`?page=${current + 1}`}>{ui.next}</Link>}
        </nav>
      )}
    </>
  );
}
