import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRequirementCopy,
  buildTaskCopy,
  requirementStatusAfterVerification,
  summarizeReadiness,
} from '../src';

test('BR-12: copied requirement is a new record that must be reviewed again', () => {
  const copy = buildRequirementCopy({
    id: 'old',
    description: 'Max 8 pages',
    type: 'MANDATORY',
    sourceType: 'CFP',
    sourceUrl: 'https://old.example/cfp',
    sourceSection: 'Page limit',
    condition: null,
    needsEvidence: true,
  });

  assert.equal(copy.status, 'NOT_REVIEWED');
  assert.equal(copy.copiedFromId, 'old');
  assert.equal(copy.sourceUrl, null);
});

test('BR-13: copied task restarts from TODO without assignee and deadline', () => {
  const copy = buildTaskCopy({ id: 't', title: 'Format paper', description: null });

  assert.equal(copy.status, 'TODO');
  assert.equal(copy.assigneeId, null);
  assert.equal(copy.dueAt, null);
});

test('Verification result maps to requirement status', () => {
  assert.equal(requirementStatusAfterVerification('PASSED'), 'VERIFIED');
  assert.equal(requirementStatusAfterVerification('FAILED'), 'NEEDS_ACTION');
  assert.equal(requirementStatusAfterVerification('NEEDS_REVISION'), 'NEEDS_ACTION');
});

test('Readiness reports missing evidence and next deadline without a score', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const result = summarizeReadiness({
    now,
    requirements: [
      {
        id: 'r1',
        description: 'Anonymous submission',
        type: 'MANDATORY',
        status: 'NEEDS_ACTION',
        needsEvidence: true,
        evidenceCount: 0,
        taskIds: ['t1'],
      },
    ],
    tasks: [{ id: 't1', title: 'Anonymize', status: 'DONE', dueAt: null }],
    deadlines: { fullPaperDeadline: new Date('2026-01-11T00:00:00Z') },
  });

  assert.equal(result.requirements.missingEvidence.length, 1);
  assert.equal(result.requirements.tasksDoneAwaitingConfirmation.length, 1);
  assert.equal(result.deadlines.next?.daysRemaining, 10);
  assert.equal('score' in result, false);
});
