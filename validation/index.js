import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';

const schema = JSON.parse(readFileSync(new URL('../schemas/activity-spec.v1.schema.json', import.meta.url)));
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: true, ownProperties: true });
addFormats(ajv);
const validate = ajv.compile(schema); // No loadSchema callback: references resolve locally only.
export const limits = Object.freeze({ maxDepth: 64, maxCollectionSize: 10000, maxStringLength: 1000000, maxNodes: 100000 });
const escape = value => value.replace(/~/g, '~0').replace(/\//g, '~1');
const messages = Object.freeze({
  required: 'A required property is missing.', additionalProperties: 'An unknown property is present.',
  type: 'The value has an invalid JSON type.', const: 'The value does not match the required constant.',
  enum: 'The value is not an allowed option.', pattern: 'The string has an invalid shape.',
  format: 'The string has an invalid format.', minLength: 'The string is too short.',
  maxLength: 'The string is too long.', maxItems: 'The array has too many items.',
  uniqueItems: 'The array contains duplicate items.', minimum: 'The number is below the minimum.',
  maximum: 'The number exceeds the maximum.', propertyNames: 'A property name is invalid.'
});
const diagnostic = (code, path, message) => ({ code, path, severity: 'error', message });

// Inspect descriptors before reading values, so getters are never executed.
function preflight(input) {
  const active = new WeakSet();
  let nodes = 0;
  function visit(value, path, depth) {
    if (++nodes > limits.maxNodes) return diagnostic('input.maxNodes', path, 'The input contains too many values.');
    if (depth > limits.maxDepth) return diagnostic('input.maxDepth', path, 'The input is nested too deeply.');
    if (typeof value === 'string') {
      if ([...value].length > limits.maxStringLength) return diagnostic('input.maxStringLength', path, 'The string exceeds the input limit.');
      return;
    }
    if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return;
    if (typeof value !== 'object') return diagnostic('input.nonJson', path, 'The value cannot be represented as JSON.');
    if (active.has(value)) return diagnostic('input.cycle', path, 'The input contains a cycle.');
    const array = Array.isArray(value);
    if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return diagnostic('input.nonJson', path, 'The object is not plain JSON data.');
    const keys = Reflect.ownKeys(value).filter(key => !(array && key === 'length'));
    if (keys.length > limits.maxCollectionSize || (array && value.length > limits.maxCollectionSize)) return diagnostic('input.maxCollectionSize', path, 'The collection exceeds the input limit.');
    if (array && keys.length !== value.length) return diagnostic('input.nonJson', path, 'The array is sparse or has extra properties.');
    active.add(value);
    for (const key of keys) {
      if (typeof key !== 'string' || (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length))) return diagnostic('input.nonJson', path, 'The object contains a non-JSON property.');
      const childPath = `${path}/${escape(key)}`;
      if ([...key].length > limits.maxStringLength) return diagnostic('input.maxStringLength', childPath, 'The property name exceeds the input limit.');
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor.enumerable || !('value' in descriptor)) return diagnostic('input.nonJson', childPath, 'The property is not plain JSON data.');
      const error = visit(descriptor.value, childPath, depth + 1);
      if (error) return error;
    }
    active.delete(value);
  }
  return visit(input, '', 0);
}

export function validateActivitySpec(input) {
  const invalidInput = preflight(input);
  if (invalidInput) return { valid: false, diagnostics: [invalidInput] };
  if (validate(input)) return { valid: true, diagnostics: [] };
  const diagnostics = validate.errors.map(error => {
    let path = error.instancePath;
    const property = error.params.missingProperty ?? error.params.additionalProperty ?? error.propertyName ?? (error.keyword === 'propertyNames' ? error.params.propertyName : undefined);
    if (property !== undefined) path += `/${escape(property)}`;
    return diagnostic(`schema.${error.keyword}`, path, messages[error.keyword] ?? 'The value violates the schema.');
  });
  const unique = [...new Map(diagnostics.map(item => [JSON.stringify(item), item])).values()];
  unique.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
  return { valid: false, diagnostics: unique };
}
