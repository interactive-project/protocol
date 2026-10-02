import { migrateLossless, type MigrationEdge } from '@interactive-project/protocol/evolution';
const edge: MigrationEdge = { sourceVersion:'0.0.1',targetVersion:'0.0.2',validateSource:()=>true,validateTarget:()=>true,forward:v=>v,reverse:v=>v };
const result = migrateLossless({}, {sourceVersion:'0.0.1',targetVersion:'0.0.2',path:[edge],getVersion:()=> '0.0.1'});
if (!result.valid) { const code: string = result.diagnostics[0].code; void code; }
// @ts-expect-error Migration callbacks must be synchronous.
const invalid: MigrationEdge = {...edge,forward:async v=>v};
void invalid;
