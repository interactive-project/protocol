import type { ActivitySpec } from '../types/activity-spec.js';
export type { Identity, Action, ActionRejectionCode, DispatchResult, EvidenceRef, Result, Snapshot, MaybePromise, EngineContext, CancellationSignal, EngineSession, EngineDriver } from '../types/interoperability.js';
export declare function canonicalJson(input: unknown): string;
export interface DigestProvider { readonly subtle: { digest(algorithm: 'SHA-256', data: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> } }
export declare function activityDigest(activity: ActivitySpec, cryptoProvider?: DigestProvider): Promise<string>;
