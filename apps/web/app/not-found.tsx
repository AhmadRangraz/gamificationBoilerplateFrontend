import { PageHeading, Panel } from '@forge/ui';
import Link from 'next/link';
import { fa } from '../lib/copy';

export default function NotFound() {
  return (
    <Panel>
      <PageHeading
        title={fa.missingTitle}
        description={fa.missingDescription}
      />
      <Link className="status-link" href="/">
        {fa.overview}
      </Link>
    </Panel>
  );
}
