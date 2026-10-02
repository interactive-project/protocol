import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { validateActivitySpec } from '../validation/index.js';
import { validateSharedContent } from '../validation/shared-content.js';
import { canonicalLocale, selectLocalizedText } from '../content/index.js';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const schema = read('../schemas/shared-content.v1.schema.json');
const ajv = new Ajv2020({ strict: true, ownProperties: true }); addFormats(ajv);
const structural = ajv.compile(schema);
const manifest = read('../fixtures/shared-content/conformance.json');
for (const entry of manifest) {
  const input = read('../fixtures/' + entry.file);
  assert.equal(structural(input), entry.schemaValid, entry.file);
  const before = JSON.stringify(input);
  assert.equal(validateSharedContent(input).valid, entry.valid, entry.file);
  assert.equal(JSON.stringify(input), before, entry.file + ': mutation');
}
const localized = read('../fixtures/shared-content/localized-text.json');
assert.equal(canonicalLocale('ES-mx'), 'es-MX');
assert.equal(selectLocalizedText(localized, ['es-MX']).locale, 'es');
assert.equal(selectLocalizedText(localized, ['de-DE', 'ar-EG']).direction, 'rtl');
assert.equal(selectLocalizedText(localized, ['fr']).locale, 'en');
assert.deepEqual(selectLocalizedText(localized, []), { text: localized.translations.en.text, locale: 'en', direction: 'ltr' });
assert.throws(() => selectLocalizedText(localized, ['en_US']), TypeError);
const extensionLocale = { ...localized, translations: { ...localized.translations, 'es-MX': { text: 'México' } } };
assert.equal(selectLocalizedText(extensionLocale, ['es-MX-u-ca-gregory']).locale, 'es-MX');
const sibling = { ...localized, translations: { en: localized.translations.en, 'es-ES': { text: 'España' } } };
assert.equal(selectLocalizedText(sibling, ['es-MX']).locale, 'en', 'Never infer a sibling region');
const absentDefault = read('../fixtures/shared-content/missing-default.json');
assert.throws(() => selectLocalizedText(absentDefault, []), TypeError);
const cycle = { ...localized }; cycle.self = cycle;
assert.equal(validateSharedContent(cycle).diagnostics[0].code, 'input.cycle');
const getter = { ...localized }; Object.defineProperty(getter, 'unsafe', { enumerable: true, get() { throw Error('Getter executed'); } });
assert.equal(validateSharedContent(getter).diagnostics[0].code, 'input.nonJson');
const canonicalRef = read('../fixtures/shared-content/content-ref.json');
for (const domain of ['quiz', 'flashcards', 'whiteboard']) {
  const spec = read('../fixtures/shared-content/' + domain + '-activity.json');
  assert(validateActivitySpec(spec).valid);
  function check(value) {
    if (!value || typeof value !== 'object') return;
    if (value.kind === 'content-ref') { assert.deepEqual(value, canonicalRef); assert(validateSharedContent(value).valid); }
    for (const child of Object.values(value)) check(child);
  }
  check(spec);
  assert.deepEqual(JSON.parse(JSON.stringify(spec)), spec);
}
console.log('Shared content: ' + manifest.length + ' structural/semantic fixtures, locale selection and nested activity round trips passed.');
