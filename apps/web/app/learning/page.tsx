import { forgeConfig } from '@forge/config';
import type { components } from '@forge/api-client';
import { formatNumber } from '@forge/shared';
import { notFound, redirect } from 'next/navigation';
import { PageHeading, Panel } from '@forge/ui';
import Link from 'next/link';
import { authorizedClient } from '../../lib/accounts';
import { presetCopy as copy, presetRoutes } from '../../lib/preset-copy';

export default async function LearningPage() {
  if (!forgeConfig.features.learning) notFound();
  const { api, options } = await authorizedClient();
  const { data: result, response } = await api.GET('/api/v1/learning', options);
  const data: components['schemas']['CourseView'][] | undefined = result;
  if (response.status === 401) redirect('/auth/login');
  if (!data) throw new Error('Unable to load learning');
  const route = presetRoutes.learning;
  return (
    <div className="progress-stack">
      <PageHeading title={route.label} description={route.description} />
      {!data.length && (
        <Panel>
          <p>{copy.noCourses}</p>
        </Panel>
      )}
      {data.map((course) => (
        <Panel key={course.id}>
          <h2>{course.title}</h2>
          <p className="preset-prose">{course.description}</p>
          <p>
            <bdi>
              {formatNumber(
                course.lessons.filter(({ completed }) => completed).length,
              )}{' '}
              / {formatNumber(course.lessons.length)}
            </bdi>
          </p>
          <ol className="progress-ledger" role="list">
            {course.lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link className="status-link" href={`/learning/${lesson.id}`}>
                  {lesson.title}
                </Link>
                {lesson.completed && <span>{copy.completedLesson}</span>}
              </li>
            ))}
          </ol>
        </Panel>
      ))}
    </div>
  );
}
