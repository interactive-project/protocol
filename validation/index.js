import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { checkJsonInput } from './json.js';
export { limits } from './json.js';

const schema = JSON.parse(readFileSync(new URL('../schemas/activity-spec.v1.schema.json', import.meta.url)));
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: true, ownProperties: true });
addFormats(ajv);
const validate = ajv.compile(schema); // No loadSchema callback: references resolve locally only.
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


export function validateActivitySpec(input) {
  const invalidInput = checkJsonInput(input);
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
