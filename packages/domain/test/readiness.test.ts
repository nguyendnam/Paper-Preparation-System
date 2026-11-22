import test from 'node:test';
import assert from 'node:assert/strict';

import { summarizeReadiness } from '../src/readiness';

test('Task DONE does not imply Requirement VERIFIED', () => {
  const result = summarizeReadiness({
    requirements: [
      {
        id: 'r1',
        description: 'Use official template',
        type: 'MANDATORY',
        status: 'PENDING_VERIFICATION',
      },
    ],

    tasks: [
      {
        id: 't1',
        title: 'Check template',
        status: 'DONE',
        dueAt: null,
      },
    ],
  });

  assert.equal(result.tasks.done, 1);
  assert.equal(result.requirements.verified, 0);
  assert.equal(
    result.requirements.mandatoryOutstanding.length,
    1,
  );
});