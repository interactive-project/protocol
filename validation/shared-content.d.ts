import type { ValidationDiagnostic } from '../types/validation-result.js';
export type SharedContentDiagnostic = Omit<ValidationDiagnostic, 'code'> & { code: ValidationDiagnostic['code'] | 'content.schema' | 'content.locale' | 'content.defaultLocale' | 'content.assetUri' };
export type SharedContentValidationResult = { valid: true; diagnostics: [] } | { valid: false; diagnostics: [SharedContentDiagnostic, ...SharedContentDiagnostic[]] };
export declare function validateSharedContent(input: unknown): SharedContentValidationResult;
