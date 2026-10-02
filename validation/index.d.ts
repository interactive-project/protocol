import type { ValidationResult } from '../types/validation-result.js';
export type { ValidationCode, ValidationDiagnostic, ValidationResult } from '../types/validation-result.js';

/** Validate the shared envelope and runtime JSON budgets, without mutating input. */
export declare function validateActivitySpec(input: unknown): ValidationResult;
export declare const limits: Readonly<{
  maxDepth: number;
  maxCollectionSize: number;
  maxStringLength: number;
  maxNodes: number;
}>;
