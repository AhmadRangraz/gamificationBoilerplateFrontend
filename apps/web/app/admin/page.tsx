import { forgeConfig } from '@forge/config';
import { PageHeading } from '@forge/ui';
import Link from 'next/link';
import { engagementCopy } from '../../lib/engagement-copy';
import { AccountsTable } from '../../components/accounts-table';
import { ui } from '../../lib/account-copy';
import { listAccounts, requireAccount } from '../../lib/accounts';

export default async function AdminPage() {
  await requireAccount(true);
  const accounts = await listAccounts();
  return (
    <>
      <PageHeading title={ui.admin} description={ui.adminDescription} />
      {forgeConfig.features.gamification && (
        <Link className="status-link" href="/admin/gamification">
          {engagementCopy.admin}
        </Link>
      )}
      <AccountsTable
        accounts={accounts}
        gamification={forgeConfig.features.gamification}
      />
    </>
  );
}
