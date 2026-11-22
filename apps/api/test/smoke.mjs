/**
 * End-to-end smoke test against a RUNNING API seeded with `pnpm db:seed`.
 *
 *   node test/smoke.mjs            (API_URL defaults to http://127.0.0.1:3001/api/v1)
 *
 * It exercises Workflow A and Workflow B including the key business rules.
 */
const BASE = process.env.API_URL ?? 'http://127.0.0.1:3001/api/v1';

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${ok ? '' : ` ${extra}`}`);
  if (!ok) failures += 1;
};

class Session {
  cookie = '';

  async call(method, path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    const json = await res.json().catch(() => ({}));
    return { status: res.status, data: json.data, error: json.error };
  }
}

async function login(email) {
  const s = new Session();
  const res = await s.call('POST', '/auth/login', { email, password: 'Demo@12345' });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${JSON.stringify(res.error)}`);
  return s;
}

const anon = new Session();
check('health is public', (await anon.call('GET', '/health')).status === 200);
check('papers require a session', (await anon.call('GET', '/papers')).status === 401);

const an = await login('an@demo.local');
const binh = await login('binh@demo.local');
const chi = await login('chi@demo.local');

// --- Papers / targets ---------------------------------------------------------------------
const papers = (await an.call('GET', '/papers')).data;
check('main author sees the demo paper', papers.length >= 1);
const paper = papers.find((p) => p.title.startsWith('A Lightweight'));
check('paper has exactly one ACTIVE target', paper?.activeTarget?.status === 'ACTIVE');
const targetId = paper.activeTarget.id;

const dup = await an.call('POST', `/papers/${paper.id}/targets`, { conferenceName: 'Another' });
check('BR-03: second ACTIVE target is rejected', dup.status === 409 && dup.error?.code === 'ACTIVE_TARGET_EXISTS', JSON.stringify(dup));

// --- Authorization --------------------------------------------------------------------------
const forbidden = await binh.call('POST', `/targets/${targetId}/requirements`, {
  description: 'x', type: 'MANDATORY', sourceType: 'CFP',
});
check('co-author cannot create requirements', forbidden.status === 403);

// --- Readiness (no score) ---------------------------------------------------------------------
const readiness = (await an.call('GET', `/targets/${targetId}/readiness`)).data;
check('readiness has no score/percentage', !JSON.stringify(readiness).match(/score|percent/i));
check('mandatory outstanding is reported', readiness.requirements.mandatoryOutstanding.length > 0);
check('BR-06: done tasks do not verify requirements', readiness.requirements.tasksDoneAwaitingConfirmation.length > 0);

// --- Workflow A: requirement -> task -> evidence -> verification ------------------------------
const reqs = (await an.call('GET', `/targets/${targetId}/requirements`)).data;
const pages = reqs.find((r) => r.description.includes('10 trang'));
check('pending-verification requirement exists', pages.status === 'PENDING_VERIFICATION');

const ev = await binh.call('POST', `/requirements/${pages.id}/evidence`, {
  type: 'URL', description: 'PDF', sourceUrl: 'https://example.org/x.pdf',
});
check('co-author can add evidence', ev.status === 201 || ev.status === 200 || ev.data?.id);
const after = (await an.call('GET', `/requirements/${pages.id}`)).data;
check('adding evidence does not change status', after.status === 'PENDING_VERIFICATION');

const badVerify = await binh.call('POST', `/requirements/${pages.id}/verifications`, { result: 'PASSED' });
check('co-author cannot verify', badVerify.status === 403);

const verify = await chi.call('POST', `/requirements/${pages.id}/verifications`, { result: 'PASSED', note: 'ok' });
check('verifier verifies', verify.data?.requirementStatus === 'VERIFIED', JSON.stringify(verify));

// --- Workflow B: transfer -----------------------------------------------------------------------
const tasks = (await an.call('GET', `/targets/${targetId}/tasks`)).data.items;
const transfer = await an.call('POST', `/targets/${targetId}/transfer`, {
  reason: 'smoke test',
  newTarget: { conferenceName: 'Smoke Conf', timezone: 'UTC' },
  copyRequirementIds: [pages.id],
  copyTaskIds: [tasks[0].id],
});
check('transfer succeeds', Boolean(transfer.data?.id), JSON.stringify(transfer));

const old = (await an.call('GET', `/targets/${targetId}`)).data;
check('old target is ARCHIVED', old.status === 'ARCHIVED');
const edit = await an.call('PATCH', `/targets/${targetId}`, { track: 'x' });
check('BR-10: archived target cannot be edited', edit.status === 409 && edit.error?.code === 'TARGET_ARCHIVED');

const newReqs = (await an.call('GET', `/targets/${transfer.data.id}/requirements`)).data;
check('BR-12: copied requirement restarts as NOT_REVIEWED', newReqs.length === 1 && newReqs[0].status === 'NOT_REVIEWED');
check('BR-14: evidence/verification are not inherited', newReqs[0].evidenceCount === 0 && newReqs[0].verificationCount === 0);
const newTasks = (await an.call('GET', `/targets/${transfer.data.id}/tasks`)).data.items;
check('BR-13: copied task is TODO without assignee/deadline',
  newTasks.length === 1 && newTasks[0].status === 'TODO' && !newTasks[0].assigneeId && !newTasks[0].dueAt);

const oldReqs = (await an.call('GET', `/targets/${targetId}/requirements`)).data;
check('old requirements are intact', oldReqs.length === reqs.length);

console.log(failures === 0 ? '\nAll smoke checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
