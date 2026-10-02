import type { GenerationContext, GenerationResult, GenerationCatalog, GenerationFailure, InputLimits } from '../types/generation.js';
import type { JsonValue } from '../types/activity-spec.js';
export type { Capability, Permission, GenerationCatalog, GenerationEntry, GenerationContext, GenerationDiagnostic, GenerationCode, GenerationResult, InputLimits } from '../types/generation.js';
export declare const defaultInputLimits: Readonly<InputLimits>;
export declare function parseGeneratedJson(source: string, policy?: Partial<InputLimits>): { valid: true; value: JsonValue } | GenerationFailure;
export declare function copyGeneratedJson(input: unknown, policy?: Partial<InputLimits>): { valid: true; value: JsonValue } | GenerationFailure;
export declare function validateGenerationCatalog(input: unknown): { valid: true; catalog: GenerationCatalog } | GenerationFailure;
export declare function validateGeneratedActivity(input: unknown, context: GenerationContext): GenerationResult;
