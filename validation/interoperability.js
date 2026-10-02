import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { checkJsonInput } from './json.js';
const schema = JSON.parse(readFileSync(new URL('../schemas/interoperability.v1.schema.json', import.meta.url)));
const ajv = new Ajv2020({ strict: true, allErrors: true, ownProperties: true, allowUnionTypes: true });
addFormats(ajv); ajv.addSchema(schema);
const validators = Object.fromEntries(['action', 'dispatchResult', 'result', 'snapshot'].map(kind => [kind, ajv.getSchema(schema.$id + '#/$defs/' + kind)]));
const escape = value => value.replace(/~/g, '~0').replace(/\//g, '~1');
const error = (code, path, message) => ({ code, path, severity: 'error', message });
function check(input, kind, expected) {
  const jsonError = checkJsonInput(input);
  if (jsonError) return { valid: false, diagnostics: [jsonError] };
  const validate = validators[kind];
  if (!validate(input)) {
    const diagnostics = validate.errors.map(item => {
      const property = item.params.missingProperty ?? item.params.additionalProperty ?? item.propertyName;
      return error('interop.schema', item.instancePath + (property === undefined ? '' : '/' + escape(property)), 'The value violates the interoperability schema.');
    });
    return { valid: false, diagnostics: [...new Map(diagnostics.map(item => [JSON.stringify(item), item])).values()].sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0) };
  }
  const diagnostics = [];
  const fields = kind === 'snapshot'
    ? { activityId: [input.activity.id, '/activity/id'], activityType: [input.activity.type, '/activity/type'], activitySchemaVersion: [input.activity.activitySchemaVersion, '/activity/activitySchemaVersion'], contentDigest: [input.activity.contentDigest, '/activity/contentDigest'], engineId: [input.engine.id, '/engine/id'], engineStateVersion: [input.engine.stateVersion, '/engine/stateVersion'], sessionId: [input.session.id, '/session/id'], attemptId: [input.session.attemptId, '/session/attemptId'] }
    : kind === 'dispatchResult' ? { actionId: [input.actionId, '/actionId'] } : { activityId: [input.activityId, '/activityId'], sessionId: [input.sessionId, '/sessionId'], attemptId: [input.attemptId, '/attemptId'] };
  for (const [key, [actual, path]] of Object.entries(fields)) {
    if (Object.hasOwn(expected, key) && expected[key] !== actual) diagnostics.push(error(key.endsWith('Version') ? 'interop.version' : 'interop.identity', path, 'The value does not match the expected host context.'));
  }
  return diagnostics.length ? { valid: false, diagnostics } : { valid: true, diagnostics: [] };
}
export const validateAction = (input, expected = {}) => check(input, 'action', expected);
export const validateDispatchResult = (input, expected = {}) => check(input, 'dispatchResult', expected);
export const validateResult = (input, expected = {}) => check(input, 'result', expected);
export const validateSnapshot = (input, expected = {}) => check(input, 'snapshot', expected);
