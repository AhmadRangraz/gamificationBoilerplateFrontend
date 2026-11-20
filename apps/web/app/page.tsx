import { forgeConfig } from '@forge/config';
import { redirect } from 'next/navigation';
import ProductOverview from '../components/product-overview';
import { presetHome } from '../lib/preset-copy';

export default function Home() {
  const start = presetHome(forgeConfig.template, forgeConfig.features);
  if (start) redirect(start);
  return <ProductOverview />;
}
