import { fa } from '../lib/copy';

export default function Loading() {
  return (
    <div role="status" className="loading">
      <span>{fa.loading}</span>
      <div className="skeleton" aria-hidden="true" />
    </div>
  );
}
