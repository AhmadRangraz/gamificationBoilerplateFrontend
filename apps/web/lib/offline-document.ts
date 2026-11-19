import { forgeConfig } from '@forge/config';
import { pwaCopy } from './pwa-copy';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function offlineDocument() {
  const { locale, project, pwa } = forgeConfig;
  return `<!doctype html>
<html lang="${locale}" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pwaCopy.offlineTitle} · ${escapeHtml(project.name)}</title>
<style>
:root{color-scheme:light dark;--accent:${pwa.themeColor};--canvas:${pwa.backgroundColor};--panel:#fff;--ink:#192c25}
*{box-sizing:border-box}
body{display:grid;place-items:center;min-height:100vh;margin:0;padding:1.4rem;background:var(--canvas);color:var(--ink);font:1rem/1.7 system-ui,sans-serif}
main{width:min(100%,31rem);padding:clamp(1.2rem,5vw,2.4rem);border:1px solid #82928a;border-radius:1.2rem;background:var(--panel)}
p:first-child{font-weight:700}
h1{margin-block:.3rem;font-size:clamp(1.55rem,6vw,2.2rem)}
nav{display:flex;flex-wrap:wrap;gap:1rem;margin-block-start:1.3rem}
a{display:inline-block;padding:.35rem .7rem;border:1px solid currentColor;border-radius:.6rem;color:inherit;text-underline-offset:.2em}
a:focus-visible{outline:3px solid currentColor;outline-offset:4px}
@media(prefers-color-scheme:dark){:root{--canvas:#111315;--panel:#1b2024;--ink:#edf2f2}}
</style>
</head>
<body>
<main>
<p>${escapeHtml(project.name)}</p>
<h1>${pwaCopy.offlineTitle}</h1>
<p>${pwaCopy.offlineDetail}</p>
<nav><a href="">${pwaCopy.retry}</a><a href="/">${pwaCopy.home}</a></nav>
</main>
</body>
</html>`;
}
