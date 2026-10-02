import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { parseGeneratedJson, copyGeneratedJson, defaultInputLimits, validateGenerationCatalog, validateGeneratedActivity } from '../generation/index.js';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const catalog = read('../fixtures/generation/catalog.json');
const ajv = new Ajv2020({ strict: true, ownProperties: true });
const ownerSchemas = Object.fromEntries(['quiz', 'code'].map(domain => { const schema = read('../fixtures/generation/' + domain + '-config.schema.json'); return [schema.$id, ajv.compile(schema)]; }));
const trace = [];
function context(policy = {}, drivers = ['fixtures/quiz-engine', 'fixtures/code-engine']) {
  return { catalog, policy, availableDrivers: drivers,
    validateDomainSchema(config, entry) { trace.push('structure'); return { valid: ownerSchemas[entry.schemaId]?.(config) === true }; },
    validateDomainSemantics(activity) { trace.push('semantic'); return { valid: activity.type === 'interactive-project/code' || activity.config.items.includes(activity.config.answer), requirements: { permissions: [], capabilities: [] } }; }
  };
}
const scenarios = read('../fixtures/generation/conformance.json');
for (const entry of scenarios) {
  trace.length = 0; const activity = read('../fixtures/' + entry.file); const before = JSON.stringify(activity);
  const result = validateGeneratedActivity(activity, context(entry.policy, entry.drivers));
  assert.equal(result.valid, entry.valid, entry.file); assert.equal(result.stage, entry.stage, entry.file);
  if (!entry.valid) assert.equal(result.diagnostics[0].code, entry.code, entry.file);
  else { assert(Object.isFrozen(result.activity)); assert(Object.isFrozen(result.activity.config)); }
  assert.equal(JSON.stringify(activity), before);
  const encoded = validateGeneratedActivity(JSON.stringify(activity), context(entry.policy, entry.drivers));
  assert.equal(encoded.valid, entry.valid, entry.file + ': encoded'); assert.equal(encoded.stage, entry.stage);
}
assert(validateGenerationCatalog(catalog).valid);
assert(validateGenerationCatalog(read('../catalogs/available-generation.v1.json')).valid);
const duplicateCatalog = structuredClone(catalog); duplicateCatalog.entries.push(duplicateCatalog.entries[0]);
assert.equal(validateGenerationCatalog(duplicateCatalog).diagnostics[0].code, 'generation.catalog');
const unsupportedDriver = structuredClone(catalog); unsupportedDriver.entries[0].capabilities.collaborative.requiredDrivers = ['fixtures/sync'];
assert.equal(validateGenerationCatalog(unsupportedDriver).diagnostics[0].code, 'generation.catalog');
const contradictoryOffline = structuredClone(catalog); contradictoryOffline.entries[0].requiredPermissions = ['network'];
assert.equal(validateGenerationCatalog(contradictoryOffline).diagnostics[0].code, 'generation.catalog');
const generated = read('../fixtures/generation/accepted-quiz.json');
const host = context(); host.validateDomainSemantics = () => { throw new Error('private validator internals'); };
assert.deepEqual(validateGeneratedActivity(generated, host).diagnostics[0], { code: 'generation.validator', path: '', severity: 'error', message: 'A trusted domain validator is missing or returned an invalid result.' });
const asynchronous = context(); asynchronous.validateDomainSchema = async () => ({ valid: true });
assert.equal(validateGeneratedActivity(generated, asynchronous).diagnostics[0].code, 'generation.validator');
const missingRequirements = context(); missingRequirements.validateDomainSemantics = () => ({ valid: true });
assert.equal(validateGeneratedActivity(generated, missingRequirements).diagnostics[0].code, 'generation.validator');
const cannotGrant = context({ execution: false }); cannotGrant.validateDomainSemantics = () => { cannotGrant.policy.execution = true; return { valid: true, requirements: { permissions: ['execution'], capabilities: [] } }; };
assert.equal(validateGeneratedActivity(generated, cannotGrant).diagnostics[0].code, 'generation.permissionDenied');
const noGeneration = context(); noGeneration.catalog = structuredClone(catalog); noGeneration.catalog.entries[0].capabilities.aiGeneratable.supported = false;
assert.equal(validateGeneratedActivity(generated, noGeneration).diagnostics[0].code, 'generation.capability');
trace.length = 0; validateGeneratedActivity(read('../fixtures/generation/domain-structure.json'), context());
assert.deepEqual(trace, ['structure'], 'Semantic validation must not run after structural rejection');
trace.length = 0; validateGeneratedActivity(read('../fixtures/generation/domain-semantics.json'), context());
assert.deepEqual(trace, ['structure', 'semantic']);
assert.equal(parseGeneratedJson('{"a":1,"a":2}').diagnostics[0].code, 'generation.duplicateKey');
assert.equal(parseGeneratedJson(String.raw`{"a":1,"\u0061":2}`).diagnostics[0].code, 'generation.duplicateKey');
for (const source of ['[1,]', '{"a":}', '01', '"bad\\xescape"', '"line\nbreak"']) assert.equal(parseGeneratedJson(source).diagnostics[0].code, 'generation.syntax');
assert.equal(parseGeneratedJson('1e400').diagnostics[0].code, 'generation.number');
assert.equal(parseGeneratedJson('9007199254740993').diagnostics[0].code, 'generation.number');
const safePrototype = parseGeneratedJson('{"__proto__":{"value":1}}'); assert(safePrototype.valid); assert(Object.hasOwn(safePrototype.value, '__proto__')); assert.equal(Object.getPrototypeOf(safePrototype.value), null);
assert.equal(parseGeneratedJson('[[[0]]]', { maxDepth: 2 }).diagnostics[0].code, 'generation.maxDepth');
assert(parseGeneratedJson('[[0]]', { maxDepth: 2 }).valid);
assert.equal(parseGeneratedJson('[1,2]', { maxCollectionSize: 1 }).diagnostics[0].code, 'generation.maxCollectionSize');
assert.equal(parseGeneratedJson('[1,2]', { maxNodes: 2 }).diagnostics[0].code, 'generation.maxNodes');
assert.equal(parseGeneratedJson('"😀😀"', { maxStringLength: 1 }).diagnostics[0].code, 'generation.maxStringLength');
assert(parseGeneratedJson('"😀"', { maxStringLength: 1 }).valid);
assert.equal(parseGeneratedJson('{}', { maxBytes: defaultInputLimits.maxBytes + 1 }).diagnostics[0].code, 'generation.policy');
assert.equal(validateGeneratedActivity('x'.repeat(defaultInputLimits.maxBytes + 1), context()).diagnostics[0].code, 'generation.maxBytes');
const compactButOversized = { values: Array(9).fill('x'.repeat(1000000)) };
assert.equal(copyGeneratedJson(compactButOversized).diagnostics[0].code, 'generation.maxBytes');
assert.equal(copyGeneratedJson({ value: Infinity }).diagnostics[0].code, 'input.nonJson');
const cycle = {}; cycle.self = cycle; assert.equal(copyGeneratedJson(cycle).diagnostics[0].code, 'input.cycle');
const getter = {}; Object.defineProperty(getter, 'x', { enumerable: true, get() { throw Error('Getter ran'); } });
assert.equal(copyGeneratedJson(getter).diagnostics[0].code, 'input.nonJson');
console.log('Generation: ' + scenarios.length + ' ordered pipeline scenarios, catalog checks, strict parser/resource boundaries and host policy isolation passed.');

assert(parseGeneratedJson('"😀"', { maxBytes: 6 }).valid);
assert.equal(parseGeneratedJson('"😀"', { maxBytes: 5 }).diagnostics[0].code, 'generation.maxBytes');
const rejectedAsync = context(); rejectedAsync.validateDomainSchema = async () => { throw Error('private async error'); };
assert.equal(validateGeneratedActivity(generated, rejectedAsync).diagnostics[0].code, 'generation.validator');
await Promise.resolve();

const needsNetworkWhileOffline = context({ network: true });
needsNetworkWhileOffline.validateDomainSemantics = () => ({ valid: true, requirements: { permissions: ['network'], capabilities: ['offline'] } });
assert.equal(validateGeneratedActivity(generated, needsNetworkWhileOffline).diagnostics[0].code, 'generation.capability');

const sparse = Array(2); assert.equal(copyGeneratedJson(sparse).diagnostics[0].code, 'input.nonJson');
const extraArray = [1]; extraArray.extra = true; assert.equal(copyGeneratedJson(extraArray).diagnostics[0].code, 'input.nonJson');
const customArray = new (class extends Array { toJSON() { throw Error('Custom serializer executed'); } })(1);
assert.equal(copyGeneratedJson(customArray).diagnostics[0].code, 'input.nonJson');
assert.equal(copyGeneratedJson({ repeated: Array(10000).fill('x'.repeat(1000000)) }).diagnostics[0].code, 'generation.maxBytes');
