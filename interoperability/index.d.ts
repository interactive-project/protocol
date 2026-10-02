import type { ActivitySpec } from '../types/activity-spec.js';
export type { Identity, Action, ActionRejectionCode, DispatchResult, EvidenceRef, Result, Snapshot, MaybePromise, EngineContext, EngineSession, EngineDriver } from '../types/interoperability.js';
export declare function canonicalJson(input: unknown): string;
export declare function activityDigest(activity: ActivitySpec, cryptoProvider?: Pick<Crypto, 'subtle'>): Promise<string>;
