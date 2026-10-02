import type { JsonValue } from '../types/activity-spec.js';
import type { GenerationFailure, InputLimits } from '../types/generation.js';
export declare const defaultInputLimits: Readonly<InputLimits>;
export declare function parseGeneratedJson(source: string, policy?: Partial<InputLimits>): { valid: true; value: JsonValue } | GenerationFailure;
export declare function copyGeneratedJson(input: unknown, policy?: Partial<InputLimits>): { valid: true; value: JsonValue } | GenerationFailure;
