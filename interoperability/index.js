import { checkJsonInput } from '../validation/json.js';
/** protocol-json-v1: sorted UTF-16 keys, ECMAScript JSON primitives, array order. */
export function canonicalJson(input) {
  const diagnostic = checkJsonInput(input);
  if (diagnostic) throw new TypeError('Input violates the JSON resource contract.');
  function encode(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(encode).join(',') + ']';
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + encode(value[key])).join(',') + '}';
  }
  return encode(input);
}
export async function activityDigest(activity, cryptoProvider = globalThis.crypto) {
  if (typeof cryptoProvider?.subtle?.digest !== 'function') throw new TypeError('A trusted Web Crypto provider is required.');
  const bytes = new TextEncoder().encode(canonicalJson(activity));
  const digest = await cryptoProvider.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
