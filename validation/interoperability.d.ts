import type { ValidationDiagnostic } from '../types/validation-result.js';
export type { Action, DispatchResult, Result, Snapshot, EngineDriver, EngineSession, EngineContext, EvidenceRef } from '../types/interoperability.js';
export type InteroperabilityDiagnostic = Omit<ValidationDiagnostic, 'code'> & { code: ValidationDiagnostic['code'] | 'interop.schema' | 'interop.identity' | 'interop.version' };
export type InteroperabilityValidationResult = { valid: true; diagnostics: [] } | { valid: false; diagnostics: [InteroperabilityDiagnostic, ...InteroperabilityDiagnostic[]] };
export interface ExpectedIdentity { activityId?: string; sessionId?: string; attemptId?: string }
export interface ExpectedSnapshot extends ExpectedIdentity { activityType?: string; activitySchemaVersion?: string; contentDigest?: string; engineId?: string; engineStateVersion?: string }
export declare function validateAction(input: unknown, expected?: ExpectedIdentity): InteroperabilityValidationResult;
export declare function validateResult(input: unknown, expected?: ExpectedIdentity): InteroperabilityValidationResult;
export declare function validateDispatchResult(input: unknown, expected?: { actionId?: string }): InteroperabilityValidationResult;
export declare function validateSnapshot(input: unknown, expected?: ExpectedSnapshot): InteroperabilityValidationResult;
