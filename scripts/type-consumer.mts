import { validateActivitySpec, limits, type ValidationDiagnostic, type ValidationResult } from '@interactive-project/protocol/validation';
import type { ActivitySpec, ValidationCode } from '@interactive-project/protocol/types';

const diagnostic: ValidationDiagnostic = { code: 'schema.required', path: '/metadata/title', severity: 'error', message: 'A required property is missing.' };
const success: ValidationResult = { valid: true, diagnostics: [] };
const failure: ValidationResult = { valid: false, diagnostics: [diagnostic] };
const result = validateActivitySpec(null as unknown);
if (result.valid) {
  const empty: [] = result.diagnostics;
  void empty;
} else {
  const first: ValidationDiagnostic = result.diagnostics[0];
  void first;
}
const depth: number = limits.maxDepth;
// @ts-expect-error Policies are immutable.
limits.maxDepth = 1;
// @ts-expect-error Failure must contain at least one diagnostic.
const invalidFailure: ValidationResult = { valid: false, diagnostics: [] };
// @ts-expect-error Success cannot contain a diagnostic.
const invalidSuccess: ValidationResult = { valid: true, diagnostics: [diagnostic] };
// @ts-expect-error Codes must be in the portable catalog.
const unknownCode: ValidationCode = 'schema.notDeclared';
// @ts-expect-error Severity is error in contract v1.
const warning: ValidationDiagnostic = { ...diagnostic, severity: 'warning' };
const activity: ActivitySpec = { protocolVersion: '1.0.0', id: '00000000-0000-4000-8000-000000000001', type: 'interactive-project/quiz', activitySchemaVersion: '1.0.0', metadata: { title: 'Quiz' }, config: {} };
validateActivitySpec(activity);
void [success, failure, depth, invalidFailure, invalidSuccess, unknownCode, warning];
