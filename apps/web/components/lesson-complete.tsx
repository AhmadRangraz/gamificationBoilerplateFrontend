'use client';

import { Button } from '@forge/ui';
import { browserApi } from '../lib/browser-api';
import { presetCopy as copy } from '../lib/preset-copy';
import { usePresetMutation } from './preset-mutation';

export function LessonComplete({
  id,
  completed,
}: {
  id: string;
  completed: boolean;
}) {
  const { save, pending, feedback } = usePresetMutation();
  if (completed) return <p role="status">{copy.completedLesson}</p>;
  return (
    <>
      {feedback}
      <Button
        disabled={pending}
        onClick={() =>
          save(() =>
            browserApi().POST('/api/v1/learning/lessons/{id}/complete', {
              params: { path: { id } },
            }),
          )
        }
      >
        {copy.markLesson}
      </Button>
    </>
  );
}
