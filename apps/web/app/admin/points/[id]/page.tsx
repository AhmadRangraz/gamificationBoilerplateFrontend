import { forgeConfig } from '@forge/config';
import { PageHeading } from '@forge/ui';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PointAdjustment } from '../../../../components/point-adjustment';
import { listAccounts, requireAccount } from '../../../../lib/accounts';
import { ui } from '../../../../lib/account-copy';
import { progressCopy as copy } from '../../../../lib/progress-copy';

export default async function PointsAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!forgeConfig.features.gamification) notFound();
  await requireAccount(true);
  const { id } = await params;
  const target = (await listAccounts()).find(
    (account) =>
      account.id === id && account.role === 'MEMBER' && !account.suspendedAt,
  );
  if (!target) notFound();
  return (
    <div className="progress-stack">
      <PageHeading
        title={`${copy.adjust} · ${target.name}`}
        description={copy.adjustDescription}
      />
      <PointAdjustment id={id} />
      <Link className="progress-link" href="/admin">
        {ui.admin}
      </Link>
    </div>
  );
}
