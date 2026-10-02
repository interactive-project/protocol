import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { validateActivitySpec } from '../validation/index.js';
import { parseGeneratedJson, copyGeneratedJson, generationFailure } from './json.js';
export { parseGeneratedJson, copyGeneratedJson, defaultInputLimits } from './json.js';
const capabilityNames = Object.freeze(["interactive","evaluable","collaborative","offline","deterministic","resumable","aiGeneratable"]);
const permissionNames = Object.freeze(["network","execution","media"]);
const schema = JSON.parse(readFileSync(new URL('../schemas/generation-catalog.v1.schema.json', import.meta.url)));
const ajv = new Ajv2020({ strict: true, allErrors: true, ownProperties: true }); addFormats(ajv);
const validateCatalog = ajv.compile(schema);
export function validateGenerationCatalog(input) {
  const isolated = copyGeneratedJson(input);
  if (!isolated.valid || !validateCatalog(isolated.value)) return generationFailure('generation.catalog');
  const keys = new Set();
  for (const entry of isolated.value.entries) {
    const key = entry.type + '@' + entry.activitySchemaVersion;
    if (keys.has(key)) return generationFailure('generation.catalog'); keys.add(key);
    for (const capability of capabilityNames) if (!entry.capabilities[capability].supported && entry.capabilities[capability].requiredDrivers?.length) return generationFailure('generation.catalog');
    if (entry.capabilities.offline.supported && entry.requiredPermissions.includes('network')) return generationFailure('generation.catalog');
  }
  return { valid: true, catalog: isolated.value };
}
export function validateGeneratedActivity(input, context) {
  if (!context || typeof context !== 'object') return generationFailure('generation.validator');
  const catalogResult = validateGenerationCatalog(context.catalog);
  if (!catalogResult.valid) return catalogResult;
  const policy = Object.fromEntries(permissionNames.map(name => [name, context.policy?.[name] === true]));
  const drivers = Array.isArray(context.availableDrivers) ? [...context.availableDrivers] : [];
  const prepared = typeof input === 'string' ? parseGeneratedJson(input, context.policy?.inputLimits) : copyGeneratedJson(input, context.policy?.inputLimits);
  if (!prepared.valid) return prepared;
  const activity = prepared.value;
  const envelope = validateActivitySpec(activity);
  if (!envelope.valid) {
    const diagnostic = envelope.diagnostics[0];
    const code = diagnostic.path === '/type' ? 'generation.unknownType' : diagnostic.path === '/protocolVersion' ? 'generation.unsupportedVersion' : 'generation.envelope';
    return generationFailure(code, 'structural', diagnostic.path);
  }
  const entries = catalogResult.catalog.entries.filter(entry => entry.type === activity.type);
  if (!entries.length) return generationFailure('generation.unknownType', 'structural', '/type');
  const entry = entries.find(entry => entry.activitySchemaVersion === activity.activitySchemaVersion);
  if (!entry) return generationFailure('generation.unsupportedVersion', 'structural', '/activitySchemaVersion');
  let structural, semantic;
  try {
    if (typeof context.validateDomainSchema !== 'function' || typeof context.validateDomainSemantics !== 'function') return generationFailure('generation.validator');
    structural = context.validateDomainSchema(activity.config, entry);
    if (structural && typeof structural.then === 'function') { Promise.resolve(structural).catch(() => {}); return generationFailure('generation.validator'); }
    if (!structural || typeof structural.valid !== 'boolean' || typeof structural.then === 'function') return generationFailure('generation.validator');
    if (!structural.valid) return generationFailure('generation.domainSchema', 'structural', '/config');
    semantic = context.validateDomainSemantics(activity, entry);
    if (semantic && typeof semantic.then === 'function') { Promise.resolve(semantic).catch(() => {}); return generationFailure('generation.validator', 'semantic'); }
    if (!semantic || typeof semantic.valid !== 'boolean' || typeof semantic.then === 'function') return generationFailure('generation.validator', 'semantic');
    if (!semantic.valid) return generationFailure('generation.semantic', 'semantic', '/config');
  } catch { return generationFailure('generation.validator', structural?.valid ? 'semantic' : 'structural'); }
  let requirements;
  try {
    const isolated = copyGeneratedJson(semantic.requirements);
    if (!isolated.valid) return generationFailure('generation.validator', 'semantic');
    requirements = isolated.value;
    if (!requirements || typeof requirements !== 'object' || Array.isArray(requirements) || Object.keys(requirements).sort().join(',') !== 'capabilities,permissions' || !Array.isArray(requirements.permissions) || !Array.isArray(requirements.capabilities) || requirements.permissions.some(name => !permissionNames.includes(name)) || requirements.capabilities.some(name => !capabilityNames.includes(name))) return generationFailure('generation.validator', 'semantic');
  } catch { return generationFailure('generation.validator', 'semantic'); }
  const requiredPermissions = new Set([...entry.requiredPermissions, ...requirements.permissions]);
  for (const permission of requiredPermissions) if (!policy[permission]) return generationFailure('generation.permissionDenied', 'permission', '/config');
  const requiredCapabilities = new Set([...entry.requiredCapabilities, ...requirements.capabilities, 'aiGeneratable']);
  for (const capability of requiredCapabilities) {
    const declaration = entry.capabilities[capability];
    if (!declaration.supported) return generationFailure('generation.capability', 'capability', '/config');
    if ((declaration.requiredDrivers ?? []).some(driver => !drivers.includes(driver))) return generationFailure('generation.missingDriver', 'capability', '/config');
  }
  return { valid: true, stage: 'accepted', activity, entry };
}
