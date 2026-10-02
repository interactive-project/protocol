import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { checkJsonInput } from './json.js';
import { canonicalLocale } from '../content/index.js';
const schema = JSON.parse(readFileSync(new URL('../schemas/shared-content.v1.schema.json', import.meta.url)));
const ajv = new Ajv2020({ allErrors: true, strict: true, ownProperties: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const escape = text => text.replace(/~/g, '~0').replace(/\//g, '~1');
const diagnostic = (code, path, message) => ({ code, path, severity: 'error', message });

export function validateSharedContent(input) {
  const jsonError = checkJsonInput(input);
  if (jsonError) return { valid: false, diagnostics: [jsonError] };
  if (!validate(input)) {
    const diagnostics = validate.errors.map(error => {
      const property = error.params.missingProperty ?? error.params.additionalProperty ?? error.propertyName;
      const path = error.instancePath + (property === undefined ? '' : '/' + escape(property));
      return diagnostic('content.schema', path, 'The value violates the shared content schema.');
    });
    return { valid: false, diagnostics: [...new Map(diagnostics.map(item => [JSON.stringify(item), item])).values()].sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0) };
  }
  const diagnostics = [];
  function visit(value, path) {
    if (!value || typeof value !== 'object') return;
    if (value.kind === 'localized-text') {
      for (const [locale, pointer] of [[value.defaultLocale, path + '/defaultLocale'], ...Object.keys(value.translations).map(locale => [locale, path + '/translations/' + escape(locale)])]) {
        try { if (canonicalLocale(locale) !== locale) throw new TypeError(); }
        catch { diagnostics.push(diagnostic('content.locale', pointer, 'A canonical supported locale identifier is required.')); }
      }
      if (!Object.hasOwn(value.translations, value.defaultLocale)) diagnostics.push(diagnostic('content.defaultLocale', path + '/defaultLocale', 'The default translation is missing.'));
    }
    if (value.kind === 'asset-ref' && value.uri !== undefined) {
      try {
        const locator = new URL(value.uri);
        if (!['https:', 'urn:'].includes(locator.protocol) || locator.username || locator.password || locator.search || locator.hash) throw new TypeError();
      } catch { diagnostics.push(diagnostic('content.assetUri', path + '/uri', 'A durable HTTPS or URN asset locator without credentials, query or fragment is required.')); }
    }
    for (const [key, child] of Object.entries(value)) visit(child, path + '/' + escape(key));
  }
  visit(input, '');
  return diagnostics.length ? { valid: false, diagnostics } : { valid: true, diagnostics: [] };
}
