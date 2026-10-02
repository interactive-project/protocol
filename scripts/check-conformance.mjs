import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateActivitySpec, limits } from '../validation/index.js';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const manifest = read('../fixtures/conformance.json');
const ajv = new Ajv2020({ strict: true });
const resultSchema = read('../schemas/validation-result.v1.schema.json');
assert(ajv.validateSchema(resultSchema));
const validateResult = ajv.compile(resultSchema);
assert.throws(() => ajv.compile({ $ref: 'https://untrusted.invalid/schema.json' }), /resolve reference/);
for (const entry of manifest) {
  const result = validateActivitySpec(read(`../fixtures/${entry.file}`));
  assert.equal(result.valid, entry.valid, entry.file);
  assert(validateResult(result), JSON.stringify(ajv.errors));
  const data = read(`../fixtures/${entry.file}`);
  assert.deepEqual(JSON.parse(JSON.stringify(data)), data);
}
const spec = () => read('../fixtures/quiz/minimal.json');
const checkInput = (value, code) => {
  const result = validateActivitySpec(value);
  assert.equal(result.valid, false);
  assert.equal(result.diagnostics[0].code, code);
  assert(validateResult(result));
};
for (const value of [undefined, NaN, Infinity, -Infinity, 1n, Symbol(), () => {}, new Date(), new Map(), new Set(), /x/, new (class {})()]) {
  const input = spec(); input.config.value = value;
  checkInput(input, 'input.nonJson');
}
const cycle = spec(); cycle.config.self = cycle.config; checkInput(cycle, 'input.cycle');
const accessor = spec(); Object.defineProperty(accessor.config, 'x', { enumerable: true, get() { throw Error('Getter executed'); } });
checkInput(accessor, 'input.nonJson');
const sparse = spec(); sparse.config.value = Array(2); checkInput(sparse, 'input.nonJson');
const extra = spec(); extra.config.value = [null]; extra.config.value.extra = true; checkInput(extra, 'input.nonJson');
const compensatedHole = spec(); compensatedHole.config.value = Array(1); compensatedHole.config.value['4294967295'] = true; checkInput(compensatedHole, 'input.nonJson');
const string = spec(); string.config.value = 'x'.repeat(limits.maxStringLength); assert(validateActivitySpec(string).valid);
string.config.value += 'x'; checkInput(string, 'input.maxStringLength');
const collection = spec(); collection.config.value = Array(limits.maxCollectionSize).fill(null); assert(validateActivitySpec(collection).valid);
collection.config.value.push(null); checkInput(collection, 'input.maxCollectionSize');
const nested = depth => { const input = spec(); let object = input.config; for (let i = 1; i < depth; i++) object = object.child = {}; return input; };
assert(validateActivitySpec(nested(limits.maxDepth)).valid);
checkInput(nested(limits.maxDepth + 1), 'input.maxDepth');
const many = spec(); many.config.values = Array.from({ length: 10 }, () => Array(10000).fill(null)); checkInput(many, 'input.maxNodes');
const escaped = validateActivitySpec(read('../fixtures/validation/escaped-property.json'));
assert.deepEqual(escaped.diagnostics, [{ code: 'schema.additionalProperties', path: '/a~1b~0c', severity: 'error', message: 'An unknown property is present.' }]);
assert.equal(validateActivitySpec(read('../fixtures/code/invalid.json')).diagnostics[0].path, '/metadata/title');
for (const item of validateActivitySpec(read('../fixtures/diagram/invalid.json')).diagnostics) {
  assert.equal(item.path, '/extensions/render~1annotation');
  assert(!item.message.includes('render/annotation'));
}

// Exact structural comparison keeps the optional TS projection aligned with the schema.
const ts = await import('typescript');
const program = ts.default.createProgram(
  ['../types/activity-spec.d.ts', '../types/validation-result.d.ts', '../validation/index.d.ts', './type-consumer.mts', './shared-content-consumer.mts', './interoperability-consumer.mts', './generation-consumer.mts'].map(path => new URL(path, import.meta.url).pathname),
  { strict: true, noEmit: true, module: ts.default.ModuleKind.NodeNext, moduleResolution: ts.default.ModuleResolutionKind.NodeNext }
);
assert.equal(ts.default.getPreEmitDiagnostics(program).length, 0);
const checker = program.getTypeChecker();
const source = program.getSourceFiles().find(file => file.fileName.endsWith('/types/activity-spec.d.ts'));
const declarations = new Map(source.statements.filter(statement => statement.name).map(statement => [statement.name.text, statement]));
const schema = read('../schemas/activity-spec.v1.schema.json');
function compare(type, shape, root = schema) {
  if (shape.$ref) shape = root.$defs[shape.$ref.split('/').at(-1)];
  if (shape.properties) {
    const props = checker.getPropertiesOfType(type);
    assert.deepEqual(props.map(p => p.name).sort(), Object.keys(shape.properties).sort());
    for (const prop of props) {
      assert.equal(!(prop.flags & ts.default.SymbolFlags.Optional), (shape.required ?? []).includes(prop.name), prop.name);
      compare(checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(prop, declarations.get('ActivitySpec'))), shape.properties[prop.name], root);
    }
  } else if (shape.enum || shape.const !== undefined) {
    const values = type.isUnion() ? type.types.map(t => t.value) : [type.value];
    assert.deepEqual(values.sort(), (shape.enum ?? [shape.const]).slice().sort());
  } else if (shape.type === 'array') {
    compare(checker.getIndexTypeOfType(type, ts.default.IndexKind.Number), shape.items, root);
  } else if (shape.type === 'object') {
    assert.equal(checker.typeToString(checker.getIndexTypeOfType(type, ts.default.IndexKind.String)), 'JsonValue');
  } else if (typeof shape.type === 'string') {
    assert.equal(checker.typeToString(type), shape.type === 'integer' ? 'number' : shape.type);
  }
}
compare(checker.getTypeAtLocation(declarations.get('ActivitySpec')), schema);
const jsonType = checker.getTypeAtLocation(declarations.get('JsonValue'));
const jsonKinds = new Set(jsonType.types.map(type => {
  if (checker.isArrayType(type)) {
    assert.equal(checker.typeToString(checker.getIndexTypeOfType(type, ts.default.IndexKind.Number)), 'JsonValue');
    return 'array';
  }
  if (type.flags & ts.default.TypeFlags.Object) {
    assert.equal(checker.typeToString(checker.getIndexTypeOfType(type, ts.default.IndexKind.String)), 'JsonValue');
    return 'object';
  }
  if (type.flags & ts.default.TypeFlags.BooleanLiteral) return 'boolean';
  return checker.typeToString(type);
}));
assert.deepEqual([...jsonKinds].sort(), schema.$defs.jsonValue.type.slice().sort());
console.log(`JavaScript: ${manifest.length} shared fixtures, runtime limits, diagnostics and TypeScript consistency passed.`);

const resultSource = program.getSourceFiles().find(file => file.fileName.endsWith('/types/validation-result.d.ts'));
const resultDeclarations = new Map(resultSource.statements.filter(statement => statement.name).map(statement => [statement.name.text, statement]));
compare(checker.getTypeAtLocation(resultDeclarations.get('ValidationDiagnostic')), resultSchema.$defs.diagnostic, resultSchema);
const codes = checker.getTypeAtLocation(resultDeclarations.get('ValidationCode')).types.map(type => type.value).sort();
assert.deepEqual(codes, resultSchema.$defs.diagnostic.properties.code.enum.slice().sort());
const before = spec(); before.config.nested = { value: [1, 'two', null] };
const serializedBefore = JSON.stringify(before);
assert(validateActivitySpec(before).valid);
assert.equal(JSON.stringify(before), serializedBefore, 'Validation must preserve authored input');
console.log('Portable diagnostics projection and package consumer type checks passed.');

const sharedSchema = read('../schemas/shared-content.v1.schema.json');
const sharedSource = program.getSourceFiles().find(file => file.fileName.endsWith('/types/shared-content.d.ts'));
const sharedDeclarations = new Map(sharedSource.statements.filter(statement => statement.name).map(statement => [statement.name.text, statement]));
function compareShared(type, shape) {
  if (shape.$ref) shape = sharedSchema.$defs[shape.$ref.split('/').at(-1)];
  if (shape.properties) {
    const props = checker.getPropertiesOfType(type);
    assert.deepEqual(props.map(prop => prop.name).sort(), Object.keys(shape.properties).sort());
    for (const prop of props) {
      assert.equal(!(prop.flags & ts.default.SymbolFlags.Optional), (shape.required ?? []).includes(prop.name), prop.name);
      compareShared(checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(prop, sharedSource)), shape.properties[prop.name]);
    }
  } else if (shape.enum || shape.const !== undefined) {
    const values = type.isUnion() ? type.types.map(item => item.value) : [type.value];
    assert.deepEqual(values.sort(), (shape.enum ?? [shape.const]).slice().sort());
  } else if (shape.type === 'object') {
    compareShared(checker.getIndexTypeOfType(type, ts.default.IndexKind.String), shape.additionalProperties);
  } else { assert.equal(checker.typeToString(type), shape.type); }
}
for (const [name, definition] of [['LocalizedText', 'localizedText'], ['Accessibility', 'accessibility'], ['ContentRef', 'contentRef'], ['AssetRef', 'assetRef']]) compareShared(checker.getTypeAtLocation(sharedDeclarations.get(name)), sharedSchema.$defs[definition]);
console.log('Shared content schema/type consistency passed.');

const headlessProgram = ts.default.createProgram(
  ['../interoperability/index.d.ts', '../validation/interoperability.d.ts', '../content/index.d.ts', '../generation/index.d.ts'].map(path => new URL(path, import.meta.url).pathname),
  { strict: true, noEmit: true, module: ts.default.ModuleKind.NodeNext, moduleResolution: ts.default.ModuleResolutionKind.NodeNext, lib: ['lib.es2022.d.ts'] }
);
assert.equal(ts.default.getPreEmitDiagnostics(headlessProgram).length, 0, 'Public contracts must compile without DOM type libraries');
console.log('Headless contract types compile with ES2022 libraries only.');

const catalogSchema = read('../schemas/generation-catalog.v1.schema.json');
const generationSource = program.getSourceFiles().find(file => file.fileName.endsWith('/types/generation.d.ts'));
const generationDeclarations = new Map(generationSource.statements.filter(statement => statement.name).map(statement => [statement.name.text, statement]));
function compareCatalog(type, shape) {
  if (shape.$ref) shape = catalogSchema.$defs[shape.$ref.split('/').at(-1)];
  if (shape.properties) {
    const props = checker.getPropertiesOfType(type);
    assert.deepEqual(props.map(prop => prop.name).sort(), Object.keys(shape.properties).sort());
    for (const prop of props) {
      assert.equal(!(prop.flags & ts.default.SymbolFlags.Optional), (shape.required ?? []).includes(prop.name));
      compareCatalog(checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(prop, generationSource)), shape.properties[prop.name]);
    }
  } else if (shape.enum || shape.const !== undefined) {
    const values = type.isUnion() ? type.types.map(item => item.value) : [type.value];
    assert.deepEqual(values.sort(), (shape.enum ?? [shape.const]).slice().sort());
  } else if (shape.type === 'array') {
    compareCatalog(checker.getIndexTypeOfType(type, ts.default.IndexKind.Number), shape.items);
  } else { assert.equal(checker.typeToString(type), shape.type); }
}
compareCatalog(checker.getTypeAtLocation(generationDeclarations.get('GenerationCatalog')), catalogSchema);
console.log('Generation catalog schema/type consistency passed.');
