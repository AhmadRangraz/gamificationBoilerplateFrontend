import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext } from '@playwright/test';
import forgeConfig from '../forge.config';
import { presetCopy as copy, presetRoutes } from '../apps/web/lib/preset-copy';

const headers = { origin: 'http://localhost:3000' };
async function account(request: APIRequestContext) {
  const response = await request.post('/api/v1/auth/register', {
    headers,
    data: {
      email: `forge-preset-${randomUUID()}@example.test`,
      name: 'کاربر آزمایشی',
      password: randomUUID(),
    },
  });
  expect(response.status()).toBe(201);
}

test('disabled preset routes are absent and responses carry security headers', async ({
  request,
}) => {
  for (const [key, route] of Object.entries(presetRoutes)) {
    if (forgeConfig.features[key as keyof typeof presetRoutes]) continue;
    expect((await request.get(route.href)).status()).toBe(404);
    const api = key === 'assistant' ? '/assistant/conversations' : route.href;
    expect((await request.get(`/api/v1${api}`)).status()).toBe(404);
  }
  const response = await request.get('/status');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['content-security-policy']).toContain(
    "object-src 'none'",
  );
});

test('booking reserves one availability slot and restricts appointment transitions', async ({
  page,
  request,
  playwright,
}) => {
  if (!forgeConfig.features.booking) return test.skip(true, 'Booking only');
  await account(page.request);
  const provider = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
  });
  try {
    await account(provider);
    await account(request);
    const title = `مشاوره ${randomUUID()}`;
    expect(
      (
        await provider.post('/api/v1/booking/services', {
          headers,
          data: { title, description: 'پرسش و پاسخ طراحی' },
        })
      ).status(),
    ).toBe(204);
    const { services } = await (await provider.get('/api/v1/booking')).json();
    const service = services.find(
      (item: { title: string }) => item.title === title,
    );
    expect(service.mine).toBe(true);
    const startsAt = new Date(Date.now() + 86400000).toISOString();
    const slotPath = `/api/v1/booking/services/${service.id}/slots`;
    expect(
      (await provider.post(slotPath, { headers, data: { startsAt } })).status(),
    ).toBe(204);
    expect(
      (await provider.post(slotPath, { headers, data: { startsAt } })).status(),
    ).toBe(409);
    const dashboard = await (await page.request.get('/api/v1/booking')).json();
    const slot = dashboard.services.find(
      (item: { title: string }) => item.title === title,
    ).slots[0];
    const path = `/api/v1/booking/slots/${slot.id}/reserve`;
    const results = await Promise.all([
      page.request.post(path, { headers }),
      request.post(path, { headers }),
    ]);
    expect(results.map((result) => result.status()).sort()).toEqual([204, 409]);
    const winner = results[0]!.ok() ? page.request : request;
    const appointment = (await (await winner.get('/api/v1/booking')).json())
      .appointments[0];
    const edit = `/api/v1/booking/appointments/${appointment.id}`;
    expect(
      (
        await winner.put(edit, { headers, data: { status: 'CONFIRMED' } })
      ).status(),
    ).toBe(404);
    expect(
      (
        await provider.put(edit, { headers, data: { status: 'CONFIRMED' } })
      ).status(),
    ).toBe(204);
    expect(
      (await (await winner.get('/api/v1/booking')).json()).appointments[0]
        .status,
    ).toBe('CONFIRMED');
    await page.goto('/booking');
    await expect(
      page.getByRole('heading', { name: presetRoutes.booking.label }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  } finally {
    await provider.dispose();
  }
});

test('community publishes, comments, reacts idempotently and notifies the author', async ({
  page,
  request,
}) => {
  if (!forgeConfig.features.community) return test.skip(true, 'Community only');
  await account(page.request);
  await account(request);
  const body = `نوشتهٔ آزمایشی ${randomUUID()} <script>ignored</script>`;
  await page.goto('/community');
  await page.getByLabel(copy.newPost).fill(body);
  await page.getByRole('button', { name: copy.publish, exact: true }).click();
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  const { posts } = await (await request.get('/api/v1/community')).json();
  const post = posts.find((item: { body: string }) => item.body === body);
  expect(post.mine).toBe(false);
  const path = `/api/v1/community/posts/${post.id}`;
  const text = 'دیدگاه آزمایشی';
  expect(
    (
      await request.post(`${path}/comments`, { headers, data: { body: text } })
    ).status(),
  ).toBe(204);
  for (let index = 0; index < 2; index++)
    expect(
      (
        await request.put(`${path}/reaction`, {
          headers,
          data: { active: true },
        })
      ).status(),
    ).toBe(204);
  expect((await request.delete(path, { headers })).status()).toBe(404);
  const writer = await (await page.request.get('/api/v1/community')).json();
  expect(
    writer.posts.find((item: { id: string }) => item.id === post.id),
  ).toMatchObject({ reactionCount: 1, comments: [{ body: text }] });
  expect(writer.notifications).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: 'COMMENT' }),
      expect.objectContaining({ kind: 'REACTION' }),
    ]),
  );
  if (forgeConfig.features.gamification)
    expect(
      await (await page.request.get('/api/v1/gamification/me')).json(),
    ).toMatchObject({
      ledger: [expect.objectContaining({ event: 'POST_PUBLISHED' })],
    });
});

test('learning opens seeded lessons and stores completion once per signed-in learner', async ({
  page,
  request,
}) => {
  if (!forgeConfig.features.learning) return test.skip(true, 'Learning only');
  await account(page.request);
  await account(request);
  const courses = await (await page.request.get('/api/v1/learning')).json();
  const lesson = courses[0].lessons[0];
  await page.goto('/learning');
  await page.getByRole('link', { name: lesson.title }).click();
  await page.getByRole('button', { name: copy.markLesson }).click();
  await expect(page.getByText(copy.completedLesson)).toBeVisible();
  const path = `/api/v1/learning/lessons/${lesson.id}`;
  expect(
    (await page.request.post(`${path}/complete`, { headers })).status(),
  ).toBe(204);
  expect(await (await request.get(path)).json()).toMatchObject({
    completed: false,
  });
  if (forgeConfig.features.gamification)
    expect(
      await (await page.request.get('/api/v1/gamification/me')).json(),
    ).toMatchObject({
      ledger: [expect.objectContaining({ event: 'LESSON_COMPLETED' })],
    });
});

test('local assistant streams structured replies and preserves private conversation history', async ({
  page,
  request,
}) => {
  if (!forgeConfig.features.assistant) return test.skip(true, 'AI only');
  await account(page.request);
  await account(request);
  const title = 'گفت‌وگوی آزمایشی';
  await page.goto('/assistant');
  await page.getByLabel(copy.title, { exact: true }).fill(title);
  await page.getByRole('button', { name: copy.newConversation }).click();
  await page.getByLabel(copy.prompt, { exact: true }).fill(copy.mockPrompt);
  await page.getByRole('button', { name: copy.send, exact: true }).click();
  await expect(
    page.getByText(`${copy.topic} · ${copy.topics.planning}`),
  ).toBeVisible();
  const catalog = await (
    await page.request.get('/api/v1/assistant/conversations')
  ).json();
  const id = catalog[0].id;
  const path = `/api/v1/assistant/conversations/${id}`;
  expect((await request.get(path)).status()).toBe(404);
  expect(await (await page.request.get(path)).json()).toMatchObject([
    { prompt: copy.mockPrompt, topic: 'planning' },
  ]);
  const body = { prompt: 'تمرین درس', requestId: randomUUID() };
  const first = await page.request.post(`${path}/turns`, {
    headers,
    data: body,
  });
  expect(first.headers()['content-type']).toContain('application/x-ndjson');
  const stream = (await first.text())
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  expect(stream.length).toBeGreaterThan(3);
  expect(stream.at(-1)).toMatchObject({
    type: 'complete',
    turn: { topic: 'learning' },
  });
  expect(
    await (
      await page.request.post(`${path}/turns`, { headers, data: body })
    ).text(),
  ).toBe(await first.text());
  expect(await (await page.request.get(path)).json()).toHaveLength(2);
});

test('active preset shell is usable on mobile and passes axe', async ({
  page,
}) => {
  const route = Object.entries(presetRoutes).find(
    ([key]) => forgeConfig.features[key as keyof typeof presetRoutes],
  )?.[1];
  if (!route) return test.skip(true, 'New vertical presets only');
  await account(page.request);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(route.href);
  await expect(
    page.getByRole('heading', { level: 1, name: route.label }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test('records lab navigation, paint and layout timing', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.addInitScript(() => {
    const metrics = { lcpMs: 0, cls: 0 };
    Object.assign(window, { forgeMetrics: metrics });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) metrics.lcpMs = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!shift.hadRecentInput) metrics.cls += shift.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/status');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        return (window as Window & { forgeMetrics: { lcpMs: number } })
          .forgeMetrics.lcpMs;
      }),
    )
    .toBeGreaterThan(0);
  const result = await page.evaluate(() => {
    const current = (
      window as Window & { forgeMetrics: { lcpMs: number; cls: number } }
    ).forgeMetrics;
    const navigation = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    return {
      ttfbMs: Math.round(navigation.responseStart),
      lcpMs: Math.round(current.lcpMs),
      cls: current.cls,
    };
  });
  console.log(`Forge lab timing: ${JSON.stringify(result)}`);
  await testInfo.attach('lab timing', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
});
