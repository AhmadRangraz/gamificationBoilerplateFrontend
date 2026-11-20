import ProductOverview from '../../components/product-overview';
import { fa } from '../../lib/copy';

export const metadata = { title: fa.overview };

export default function DocsPage() {
  return <ProductOverview />;
}
