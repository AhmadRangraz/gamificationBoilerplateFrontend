'use client';

import { fa } from '../lib/copy';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="error-panel" role="alert">
      <h1>{fa.errorTitle}</h1>
      <p>{fa.errorDescription}</p>
      <button className="status-link" type="button" onClick={reset}>
        {fa.refresh}
      </button>
    </section>
  );
}
