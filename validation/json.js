export const limits = Object.freeze({ maxDepth: 64, maxCollectionSize: 10000, maxStringLength: 1000000, maxNodes: 100000 });
const escape = value => value.replace(/~/g, '~0').replace(/\//g, '~1');
const diagnostic = (code, path, message) => ({ code, path, severity: 'error', message });

// Inspect descriptors before reading values, so getters are never executed.
export function checkJsonInput(input) {
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

