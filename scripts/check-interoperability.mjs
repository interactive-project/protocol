import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { validateActivitySpec } from '../validation/index.js';
import { validateAction, validateResult, validateSnapshot, validateDispatchResult } from '../validation/interoperability.js';
import { canonicalJson, activityDigest } from '../interoperability/index.js';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const validators = { action: validateAction, result: validateResult, snapshot: validateSnapshot, dispatchResult: validateDispatchResult };
const manifest = read('../fixtures/interoperability/conformance.json');
for (const entry of manifest) {
  const value = read('../fixtures/' + entry.file); const before = JSON.stringify(value);
  assert.equal(validators[entry.kind](value).valid, entry.valid, entry.file);
  assert.equal(JSON.stringify(value), before);
}
const action = read('../fixtures/interoperability/quiz-action.json');
assert(validateAction(action, { activityId: action.activityId, sessionId: action.sessionId, attemptId: action.attemptId }).valid);
assert.equal(validateAction(action, { sessionId: '00000000-0000-4000-8000-000000000999' }).diagnostics[0].code, 'interop.identity');
assert.equal(validateDispatchResult(read('../fixtures/interoperability/accepted.json'), { actionId: '00000000-0000-4000-8000-000000000999' }).diagnostics[0].path, '/actionId');
assert.equal(validateResult(read('../fixtures/interoperability/quiz-result.json'), { attemptId: '00000000-0000-4000-8000-000000000999' }).diagnostics[0].code, 'interop.identity');
for (const domain of ['quiz', 'whiteboard', 'simulation']) {
  const activity = read('../fixtures/interoperability/' + domain + '-activity.json');
  const snapshot = read('../fixtures/interoperability/' + domain + '-snapshot.json');
  assert(validateActivitySpec(activity).valid);
  assert.equal(await activityDigest(activity, webcrypto), snapshot.activity.contentDigest);
  const expected = { activityId: activity.id, activityType: activity.type, activitySchemaVersion: activity.activitySchemaVersion, contentDigest: snapshot.activity.contentDigest, engineId: snapshot.engine.id, engineStateVersion: snapshot.engine.stateVersion };
  assert(validateSnapshot(snapshot, expected).valid);
  assert.equal(validateSnapshot(snapshot, { ...expected, contentDigest: 'f'.repeat(64) }).diagnostics[0].path, '/activity/contentDigest');
  assert.equal(validateSnapshot(snapshot, { ...expected, engineStateVersion: '2.0.0' }).diagnostics[0].code, 'interop.version');
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot);
  assert.equal(await activityDigest(JSON.parse(canonicalJson(activity)), webcrypto), snapshot.activity.contentDigest);
}
assert.equal(canonicalJson({ '2': 2, '10': 10, '1': 1 }), '{"1":1,"10":10,"2":2}');
assert.equal(canonicalJson({ b: [1, -0, null], a: 'two' }), '{"a":"two","b":[1,0,null]}');
assert.equal(canonicalJson({ '\u{10000}': 1, '\uE000': 2 }), '{"𐀀":1,"":2}');
assert.throws(() => canonicalJson({ value: Infinity }), TypeError);
assert.throws(() => canonicalJson({ get value() { throw Error('Getter executed'); } }), TypeError);
await assert.rejects(activityDigest(read('../fixtures/interoperability/quiz-activity.json'), {}), TypeError);
const invalid = read('../fixtures/interoperability/quiz-result.json'); invalid.score.value = NaN;
assert.equal(validateResult(invalid).diagnostics[0].code, 'input.nonJson');
const schema = read('../schemas/interoperability.v1.schema.json');
const activitySchema = read('../schemas/activity-spec.v1.schema.json');
assert.deepEqual(schema.$defs.snapshot.properties.activity.properties.type.enum, activitySchema.properties.type.enum);
assert.deepEqual(schema.$defs.action.properties.activityId, activitySchema.properties.id);
console.log('Interoperability: ' + manifest.length + ' fixtures, identity/version binding, partial credit and authored snapshot digests passed.');
