import { limits } from '../validation/json.js';
export const defaultInputLimits = Object.freeze({ maxBytes: 8388608, ...limits });
const messages = {
  "input.nonJson": "The value cannot be represented as JSON.",
  "input.cycle": "The input contains a cycle.",
  "generation.policy": "The host input policy is invalid.",
  "generation.maxBytes": "The encoded input exceeds the host byte budget.",
  "generation.maxDepth": "The input exceeds the host depth budget.",
  "generation.maxCollectionSize": "The input exceeds the host collection budget.",
  "generation.maxStringLength": "The input exceeds the host string budget.",
  "generation.maxNodes": "The input exceeds the host node budget.",
  "generation.syntax": "The generated text is not valid JSON.",
  "generation.duplicateKey": "Duplicate JSON member names are not allowed.",
  "generation.number": "The JSON number is outside the supported numeric range.",
  "generation.catalog": "The trusted generation catalog is invalid.",
  "generation.unknownType": "The activity type is not present in the trusted catalog.",
  "generation.unsupportedVersion": "The activity version is not supported by the trusted catalog.",
  "generation.envelope": "The activity violates the shared envelope contract.",
  "generation.domainSchema": "The config violates its registered domain schema.",
  "generation.semantic": "The activity violates its domain semantic contract.",
  "generation.validator": "A trusted domain validator is missing or returned an invalid result.",
  "generation.permissionDenied": "The host policy denies a required permission.",
  "generation.missingDriver": "A required registered driver is unavailable.",
  "generation.capability": "A required capability is unavailable."
};
export function generationFailure(code, stage = 'structural', path = '') {
  return { valid: false, stage, diagnostics: [{ code, path, severity: 'error', message: messages[code] }] };
}
class Failure extends Error { constructor(code, path = '') { super(code); this.code = code; this.path = path; } }
function budgets(policy = {}) {
  const result = { ...defaultInputLimits };
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Failure('generation.policy');
  for (const [key, value] of Object.entries(policy)) {
    if (!Object.hasOwn(result, key) || !Number.isSafeInteger(value) || value < (key === 'maxNodes' || key === 'maxBytes' ? 1 : 0) || value > result[key]) throw new Failure('generation.policy');
    result[key] = value;
  }
  return result;
}
function utf8Size(text, maximum = Infinity) {
  let size = 0;
  for (const character of text) { const cp = character.codePointAt(0); size += cp < 128 ? 1 : cp < 2048 ? 2 : cp < 65536 ? 3 : 4; if (size > maximum) throw new Failure('generation.maxBytes'); }
  return size;
}
function stringBudget(text, limit) { let count = 0; for (const character of text) { void character; if (++count > limit) throw new Failure('generation.maxStringLength'); } }
function frozen(value) { if (value && typeof value === 'object') { for (const child of Object.values(value)) frozen(child); Object.freeze(value); } return value; }
/** Strict JSON parsing: bounds are checked while parsing and decoded duplicate names fail. */
export function parseGeneratedJson(source, policy = {}) {
  try {
    const limit = budgets(policy);
    if (typeof source !== 'string') throw new Failure('generation.syntax');
    if (utf8Size(source, limit.maxBytes) > limit.maxBytes) throw new Failure('generation.maxBytes');
    let position = 0, nodes = 0;
    const number = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;
    function whitespace() { while ([' ', '\t', '\r', '\n'].includes(source[position])) position++; }
    function string() {
      const start = position++;
      while (position < source.length) {
        if (source[position] === '\\') { position += 2; continue; }
        if (source[position++] === '"') {
          let value; try { value = JSON.parse(source.slice(start, position)); } catch { throw new Failure('generation.syntax'); }
          stringBudget(value, limit.maxStringLength); return value;
        }
      }
      throw new Failure('generation.syntax');
    }
    function value(depth) {
      if (++nodes > limit.maxNodes) throw new Failure('generation.maxNodes');
      if (depth > limit.maxDepth) throw new Failure('generation.maxDepth');
      whitespace(); const character = source[position];
      if (character === '"') return string();
      if (character === '{') {
        position++; whitespace(); const result = Object.create(null); let count = 0;
        if (source[position] === '}') { position++; return result; }
        while (true) {
          if (++count > limit.maxCollectionSize) throw new Failure('generation.maxCollectionSize');
          whitespace(); if (source[position] !== '"') throw new Failure('generation.syntax');
          const key = string(); if (Object.hasOwn(result, key)) throw new Failure('generation.duplicateKey');
          whitespace(); if (source[position++] !== ':') throw new Failure('generation.syntax');
          result[key] = value(depth + 1); whitespace(); const separator = source[position++];
          if (separator === '}') return result;
          if (separator !== ',') throw new Failure('generation.syntax');
        }
      }
      if (character === '[') {
        position++; whitespace(); const result = [];
        if (source[position] === ']') { position++; return result; }
        while (true) {
          if (result.length >= limit.maxCollectionSize) throw new Failure('generation.maxCollectionSize');
          result.push(value(depth + 1)); whitespace(); const separator = source[position++];
          if (separator === ']') return result;
          if (separator !== ',') throw new Failure('generation.syntax');
        }
      }
      for (const [token, literal] of [['true', true], ['false', false], ['null', null]]) if (source.startsWith(token, position)) { position += token.length; return literal; }
      number.lastIndex = position; const match = number.exec(source);
      if (!match) throw new Failure('generation.syntax');
      position = number.lastIndex; const numeric = Number(match[0]);
      if (!Number.isFinite(numeric) || (Number.isInteger(numeric) && !Number.isSafeInteger(numeric))) throw new Failure('generation.number');
      return numeric;
    }
    const parsed = value(0); whitespace(); if (position !== source.length) throw new Failure('generation.syntax');
    return { valid: true, value: frozen(parsed) };
  } catch (failure) { if (failure instanceof Failure) return generationFailure(failure.code); throw failure; }
}
/** Inspect descriptors while estimating encoded size; never serialize caller containers. */
export function copyGeneratedJson(input, policy = {}) {
  try {
    const limit = budgets(policy), active = new WeakSet(); let bytes = 0, nodes = 0;
    const add = count => { bytes += count; if (bytes > limit.maxBytes) throw new Failure('generation.maxBytes'); };
    const escape = key => key.replace(/~/g, '~0').replace(/\//g, '~1');
    function visit(value, depth, path) {
      if (++nodes > limit.maxNodes) throw new Failure('generation.maxNodes', path);
      if (depth > limit.maxDepth) throw new Failure('generation.maxDepth', path);
      if (value === null || typeof value === 'boolean' || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) {
        if (typeof value === 'string') stringBudget(value, limit.maxStringLength);
        if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)) throw new Failure('generation.number', path);
        add(utf8Size(JSON.stringify(value), limit.maxBytes - bytes)); return Object.is(value, -0) ? 0 : value;
      }
      if (typeof value !== 'object') throw new Failure('input.nonJson', path);
      if (active.has(value)) throw new Failure('input.cycle', path);
      const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
      if (array ? ![Array.prototype, null].includes(prototype) : ![Object.prototype, null].includes(prototype)) throw new Failure('input.nonJson', path);
      const length = array ? Object.getOwnPropertyDescriptor(value, 'length').value : 0;
      if (array && length > limit.maxCollectionSize) throw new Failure('generation.maxCollectionSize', path);
      const keys = Reflect.ownKeys(value).filter(key => !(array && key === 'length'));
      if (keys.length > limit.maxCollectionSize) throw new Failure('generation.maxCollectionSize', path);
      if (array && keys.length !== length) throw new Failure('input.nonJson', path);
      add(2 + Math.max(0, keys.length - 1)); active.add(value);
      const copy = array ? [] : Object.create(null);
      for (const key of keys) {
        if (typeof key !== 'string' || (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= length))) throw new Failure('input.nonJson', path);
        const childPath = path + '/' + escape(key);
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor.enumerable || !('value' in descriptor)) throw new Failure('input.nonJson', childPath);
        if (!array) { stringBudget(key, limit.maxStringLength); add(utf8Size(JSON.stringify(key), limit.maxBytes - bytes) + 1); }
        copy[key] = visit(descriptor.value, depth + 1, childPath);
      }
      active.delete(value); return Object.freeze(copy);
    }
    return { valid: true, value: visit(input, 0, '') };
  } catch (failure) {
    if (failure instanceof Failure) return generationFailure(failure.code, 'structural', failure.path);
    return generationFailure('input.nonJson');
  }
}
