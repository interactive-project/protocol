import { activityDigest, canonicalJson, type EngineDriver, type EngineSession, type Action, type Result, type Snapshot } from '@interactive-project/protocol/interoperability';
import { validateAction, validateSnapshot } from '@interactive-project/protocol/validation/interoperability';
declare const action: Action;
declare const snapshot: Snapshot;
declare const session: EngineSession;
const asynchronous: EngineDriver = { async create(activity, context) { await activityDigest(activity); void context; return session; } };
const synchronous: EngineDriver = { create() { return session; } };
validateAction(action, { activityId: action.activityId, sessionId: action.sessionId });
validateSnapshot(snapshot, { engineStateVersion: snapshot.engine.stateVersion });
canonicalJson(snapshot);
// @ts-expect-error Results must identify the state revision evaluated.
const missingRevision: Result = { protocolVersion: '1.0.0', resultVersion: '1.0.0', activityId: 'id', sessionId: 'session', status: 'completed', score: { value: 0.5, scale: 'normalized' }, evidence: [] };
// @ts-expect-error Pending evaluation cannot be represented as a completed score.
const missingReason: Result = { protocolVersion: '1.0.0', resultVersion: '1.0.0', activityId: 'id', sessionId: 'session', revision: 0, status: 'pending', evidence: [] };
declare const result: Result;
if (result.status === 'completed') { const score: number = result.score.value; void score; }
if (result.status === 'failed') { const message: string = result.failure.message; void message; }
void [asynchronous, synchronous, missingRevision, missingReason];

const nativeSignalDriver: EngineDriver = { create(activity, context) { void context.signal; void activity; return session; } };
const signalCompatible: Parameters<EngineDriver['create']>[1] = { sessionId: 'host-session', signal: new AbortController().signal };
void [nativeSignalDriver, signalCompatible];
