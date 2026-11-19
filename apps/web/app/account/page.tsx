import { forgeConfig } from '@forge/config';
import Link from 'next/link';
import { progressCopy } from '../../lib/progress-copy';
import { PageHeading } from '@forge/ui';
import { ProfileForm } from '../../components/profile-form';
import { ui } from '../../lib/account-copy';
import { requireAccount } from '../../lib/accounts';

export default async function AccountPage() {
  const account = await requireAccount();
  return (
    <>
      <PageHeading title={ui.profile} description={ui.profileDescription} />
      {forgeConfig.features.gamification && (
        <Link className="status-link progress-link" href="/progress">
          {progressCopy.title}
        </Link>
      )}
      <div className="profile-grid">
        <ProfileForm account={account} />
      </div>
    </>
  );
}
