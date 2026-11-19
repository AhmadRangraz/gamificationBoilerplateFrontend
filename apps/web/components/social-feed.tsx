'use client';

import type { components } from '@forge/api-client';
import { formatJalaliDate, formatNumber } from '@forge/shared';
import { Button, Field, Panel } from '@forge/ui';
import { ui } from '../lib/account-copy';
import { browserApi } from '../lib/browser-api';
import { presetCopy as copy } from '../lib/preset-copy';
import { usePresetMutation } from './preset-mutation';

export function SocialFeed({
  posts,
  notifications,
}: components['schemas']['FeedView']) {
  const { pending, save, feedback } = usePresetMutation();
  return (
    <>
      {feedback}
      <Panel>
        <form
          className="ui-form"
          action={(data) =>
            save(() =>
              browserApi().POST('/api/v1/community/posts', {
                body: { body: String(data.get('body') ?? '') },
              }),
            )
          }
        >
          <Field id="new-post" label={copy.newPost}>
            <textarea
              className="ui-input"
              id="new-post"
              name="body"
              required
              maxLength={2000}
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {copy.publish}
          </Button>
        </form>
      </Panel>
      {!!notifications.length && (
        <Panel>
          <h2>{copy.notifications}</h2>
          <ul>
            {notifications.map((item, index) => (
              <li key={index}>
                <bdi>{item.actor}</bdi> {copy.socialNotice[item.kind]}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {!posts.length && (
        <Panel>
          <p>{copy.noPosts}</p>
        </Panel>
      )}
      {posts.map((post) => (
        <Panel key={post.id}>
          <h2>
            <bdi>{post.author}</bdi>
          </h2>
          <time dateTime={post.createdAt}>
            {formatJalaliDate(new Date(post.createdAt))}
          </time>
          <p className="preset-prose">{post.body}</p>
          <div className="action-row">
            <Button
              tone="quiet"
              disabled={pending}
              aria-pressed={post.reacted}
              onClick={() =>
                save(() =>
                  browserApi().PUT('/api/v1/community/posts/{id}/reaction', {
                    params: { path: { id: post.id } },
                    body: { active: !post.reacted },
                  }),
                )
              }
            >
              {post.reacted ? copy.removeReaction : copy.react} ·{' '}
              {formatNumber(post.reactionCount)}
            </Button>
            {post.mine && (
              <Button
                tone="danger"
                disabled={pending}
                onClick={() =>
                  save(() =>
                    browserApi().DELETE('/api/v1/community/posts/{id}', {
                      params: { path: { id: post.id } },
                    }),
                  )
                }
              >
                {ui.delete}
              </Button>
            )}
          </div>
          <ul className="progress-ledger" role="list">
            {post.comments.map((comment) => (
              <li key={comment.id}>
                <div>
                  <strong>
                    <bdi>{comment.author}</bdi>
                  </strong>
                  <p className="preset-prose">{comment.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <form
            className="ui-form"
            action={(data) =>
              save(() =>
                browserApi().POST('/api/v1/community/posts/{id}/comments', {
                  params: { path: { id: post.id } },
                  body: { body: String(data.get('body') ?? '') },
                }),
              )
            }
          >
            <Field id={`comment-${post.id}`} label={copy.comment}>
              <textarea
                className="ui-input"
                id={`comment-${post.id}`}
                name="body"
                required
                maxLength={600}
              />
            </Field>
            <Button type="submit" disabled={pending}>
              {copy.addComment}
            </Button>
          </form>
        </Panel>
      ))}
    </>
  );
}
