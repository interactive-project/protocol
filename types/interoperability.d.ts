import type { ActivitySpec, ActivityType, JsonValue } from './activity-spec.js';
export interface Identity { protocolVersion: '1.0.0'; activityId: string; sessionId: string; attemptId?: string }
export interface Action extends Identity {
  actionVersion: '1.0.0'; id: string; type: string; sequence: number; payload: Record<string, JsonValue>;
}
export type ActionRejectionCode = 'action.unknown' | 'action.invalid' | 'action.stale' | 'action.identity' | 'action.busy' | 'action.disposed' | 'action.permission' | 'action.capability';
export type DispatchResult =
  | { status: 'accepted'; actionId: string; revision: number }
  | { status: 'rejected'; actionId: string; code: ActionRejectionCode; path: string; message: string };
export interface EvidenceRef { id: string; type: string }
export interface ResultIdentity extends Identity { resultVersion: '1.0.0'; revision: number; evidence: EvidenceRef[] }
export type Result =
  | (ResultIdentity & { status: 'completed'; score: { value: number; scale: 'normalized' } })
  | (ResultIdentity & { status: 'pending'; pendingReason: 'initialization' | 'effects' | 'evaluation' | 'response' })
  | (ResultIdentity & { status: 'failed'; failure: { code: 'evaluation.failure' | 'evaluation.timeout' | 'evaluation.cancelled'; message: string } })
  | (ResultIdentity & { status: 'unevaluable'; reason: 'unassessed' | 'unsupported' | 'not-ready' | 'not-allowed' });
export interface Snapshot {
  protocolVersion: '1.0.0'; snapshotVersion: '1.0.0';
  activity: { id: string; type: ActivityType; activitySchemaVersion: string; contentDigest: string };
  engine: { id: string; stateVersion: string };
  session: { id: string; attemptId?: string; revision: number };
  state: Record<string, JsonValue>;
  drivers?: Record<string, { driverVersion: string; stateVersion: string; encoding: 'json'; data: JsonValue }>;
}
/** Live host port. Functions, AbortSignal and services never belong in serialized data. */
export type MaybePromise<T> = T | PromiseLike<T>;
export interface EngineContext { sessionId: string; attemptId?: string; signal?: AbortSignal; services?: Readonly<Record<string, unknown>> }
export interface EngineSession {
  dispatch(action: Action, options?: { signal?: AbortSignal }): MaybePromise<DispatchResult>;
  evaluate(options?: { signal?: AbortSignal }): MaybePromise<Result>;
  serialize(): MaybePromise<Snapshot>;
  restore(snapshot: Snapshot, options?: { signal?: AbortSignal }): MaybePromise<void>;
  dispose(): MaybePromise<void>;
}
export interface EngineDriver { create(activity: ActivitySpec, context: EngineContext): MaybePromise<EngineSession> }
