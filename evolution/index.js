import { copyGeneratedJson } from '../generation/json.js';
const version = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const messages = {
  'migration.path': 'The explicit migration path is unsupported.',
  'migration.input': 'The source cannot be represented within the JSON input policy.',
  'migration.source': 'The source fails its exact version validator.',
  'migration.target': 'The target fails its exact version validator.',
  'migration.transform': 'A trusted synchronous migration failed.',
  'migration.loss': 'The inverse migration did not reconstruct the source.'
};
const fail = code => ({ valid: false, diagnostics: [{ code, path: '', severity: 'error', message: messages[code] }] });
function sync(call) { const value = call(); if (value && typeof value.then === 'function') { Promise.resolve(value).catch(() => {}); throw Error('async'); } return value; }
function equal(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a).sort(), other = Object.keys(b).sort();
  return keys.length === other.length && keys.every((key, index) => key === other[index] && equal(a[key], b[key]));
}
/** Trusted synchronous callbacks only; lossless paths preserve the original on failure. */
export function migrateLossless(input, request) {
  let sourceVersion, targetVersion, path, getVersion;
  try {
    ({ sourceVersion, targetVersion, path, getVersion } = request);
    if (!version.test(sourceVersion) || !version.test(targetVersion) || !Array.isArray(path) || path.length < 1 || path.length > 32 || sourceVersion === targetVersion || typeof getVersion !== 'function') return fail('migration.path');
    path = path.map(edge => ({ ...edge }));
    let current = sourceVersion; const seen = new Set([current]);
    for (const edge of path) {
      if (edge.sourceVersion !== current || !version.test(edge.targetVersion) || seen.has(edge.targetVersion) || ['validateSource','validateTarget','forward','reverse'].some(key => typeof edge[key] !== 'function')) return fail('migration.path');
      current = edge.targetVersion; seen.add(current);
    }
    if (current !== targetVersion) return fail('migration.path');
  } catch { return fail('migration.path'); }
  const initial = copyGeneratedJson(input); if (!initial.valid) return fail('migration.input');
  let value = initial.value;
  for (const edge of path) {
    try { if (sync(() => getVersion(value)) !== edge.sourceVersion || sync(() => edge.validateSource(value)) !== true) return fail('migration.source'); } catch { return fail('migration.source'); }
    let next;
    try { const prepared = copyGeneratedJson(sync(() => edge.forward(value))); if (!prepared.valid) return fail('migration.transform'); next = prepared.value; } catch { return fail('migration.transform'); }
    try { if (sync(() => getVersion(next)) !== edge.targetVersion || sync(() => edge.validateTarget(next)) !== true) return fail('migration.target'); } catch { return fail('migration.target'); }
    try { const reversed = copyGeneratedJson(sync(() => edge.reverse(next))); if (!reversed.valid || !equal(reversed.value, value)) return fail('migration.loss'); } catch { return fail('migration.loss'); }
    value = next;
  }
  return { valid: true, value, sourceVersion, targetVersion };
}
