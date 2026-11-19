import { forgeConfig } from '@forge/config';
import { notFound, redirect } from 'next/navigation';
import { PageHeading } from '@forge/ui';
import { Booking } from '../../components/booking';
import { authorizedClient } from '../../lib/accounts';
import { presetRoutes } from '../../lib/preset-copy';

export default async function BookingPage() {
  if (!forgeConfig.features.booking) notFound();
  const { api, options } = await authorizedClient();
  const { data, response } = await api.GET('/api/v1/booking', options);
  if (response.status === 401) redirect('/auth/login');
  if (!data) throw new Error('Unable to load booking');
  const route = presetRoutes.booking;
  return (
    <div className="progress-stack">
      <PageHeading title={route.label} description={route.description} />
      <Booking {...data} />
    </div>
  );
}
