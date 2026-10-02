import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrateLossless } from '../evolution/index.js';
import { validateActivitySpec } from '../validation/index.js';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const source = read('../fixtures/evolution/source.json'), before = JSON.stringify(source);
function edge(from, to, oldKey, newKey) {
  const validate = (v, ver, key) => v.activitySchemaVersion === ver && typeof v.config[key] === 'string' && validateActivitySpec(v).valid;
  const rename = (v, ver, a, b) => { const copy = structuredClone(v); copy.activitySchemaVersion = ver; copy.config[b] = copy.config[a]; delete copy.config[a]; return copy; };
  return { sourceVersion: from, targetVersion: to, validateSource: v => validate(v, from, oldKey), validateTarget: v => validate(v, to, newKey), forward: v => rename(v, to, oldKey, newKey), reverse: v => rename(v, from, newKey, oldKey) };
}
const path = [edge('0.0.1','0.0.2','question','prompt'),edge('0.0.2','0.0.3','prompt','stem')];
const request = { sourceVersion: '0.0.1', targetVersion: '0.0.3', path, getVersion: v => v.activitySchemaVersion };
const migrated = migrateLossless(source, request);
assert(migrated.valid); assert.equal(migrated.value.config.stem, source.config.question); assert.deepEqual(JSON.parse(JSON.stringify(migrated.value.extensions)), source.extensions);
assert(Object.isFrozen(migrated.value)); assert(Object.isFrozen(migrated.value.extensions)); assert.equal(JSON.stringify(source), before);
const reject = (input, config, code) => { const result = migrateLossless(input, config); assert.equal(result.valid, false); assert.equal(result.diagnostics[0].code, code); assert(!('value' in result), 'No partial migrated artifact'); };
reject(source, { ...request, path: [] }, 'migration.path');
reject(source, { ...request, targetVersion: '0.0.4' }, 'migration.path');
reject(source, { ...request, path: [path[1],path[0]] }, 'migration.path');
reject(source, { ...request, path: [path[0],{...path[1],targetVersion:'0.0.1'}] }, 'migration.path');
reject({...source,activitySchemaVersion:'0.0.2'}, request, 'migration.source');
reject({...source,config:{}}, request, 'migration.source');
reject(source, {...request,path:[{...path[0],forward: v => ({...v,activitySchemaVersion:'0.0.2',config:{}})},path[1]]}, 'migration.target');
reject(source, {...request,path:[{...path[0],forward: v => { const copy=path[0].forward(v); delete copy.extensions; return copy; }},path[1]]}, 'migration.loss');
reject(source, {...request,path:[{...path[0],forward: () => {throw Error('private');}},path[1]]}, 'migration.transform');
reject(source, {...request,path:[{...path[0],forward: async () => {throw Error('private async');}},path[1]]}, 'migration.transform');
reject(source, {...request,path:[{...path[0],validateSource: async()=>true},path[1]]}, 'migration.source');
const cyclic={}; cyclic.self=cyclic; reject(cyclic,request,'migration.input'); await Promise.resolve();
const unknown=structuredClone(source); unknown.extensions['org.example/future']={opaque:[false,null,123]};
const roundtrip=JSON.parse(JSON.stringify(unknown)); assert(validateActivitySpec(roundtrip).valid); assert.deepEqual(roundtrip.extensions,unknown.extensions);
const catalog=read('../catalogs/conformance-plan.v1.json'), domains=['quiz','flashcards','code','simulation','diagram','whiteboard'], hosts=['headless','dom','react','vue','svelte'];
assert.equal(catalog.catalogVersion,'1.0.0'); assert.equal(catalog.suites.length,30);
assert.equal(new Set(catalog.suites.map(s=>s.id)).size,30);
for(const domain of domains) for(const host of hosts) {
 const suite=catalog.suites.find(s=>s.id===domain+'/'+host); assert(suite); assert.equal(suite.status,'planned'); assert.equal(suite.domain,'interactive-project/'+domain); assert.equal(suite.host,host);
 for(const requirement of ['optional-extension-preservation','required-capability-rejection','oldest-newest-contracts','snapshot-roundtrip-and-version-rejection']) assert(suite.requirements.includes(requirement));
 assert(suite.implementationIssue.startsWith('https://github.com/interactive-project/'));
}
const matrix=read('../catalogs/compatibility.v1.json'); assert.equal(matrix.matrixVersion,'1.0.0'); assert.equal(new Set(matrix.components.map(c=>c.id)).size,matrix.components.length);
for(const component of matrix.components) {
 for(const kind of ['spec','action','result','snapshot','event']) assert(Array.isArray(component.contracts[kind]));
 if(component.status==='planned') { assert.equal(component.packageVersion,null); assert(Object.values(component.contracts).every(versions=>versions.length===0)); }
 else { assert.equal(component.id,'interactive-project/protocol'); assert.equal(component.packageVersion,read('../package.json').version); }
}
const protocol=matrix.components.find(c=>c.id==='interactive-project/protocol');
assert.deepEqual(protocol.contracts.spec,[read('../schemas/activity-spec.v1.schema.json').properties.protocolVersion.const]);
const interop=read('../schemas/interoperability.v1.schema.json').$defs;
for(const [kind,def,field] of [['action','action','actionVersion'],['result','completed','resultVersion'],['snapshot','snapshot','snapshotVersion']]) assert.deepEqual(protocol.contracts[kind],[interop[def].properties[field].const]);
assert.deepEqual(protocol.contracts.event,[]);
console.log('Evolution: lossless migration acceptance/rejection, opaque preservation, 30 planned suites and advertised exact matrix verified.');
