/** Optional structural projection of validation-result.v1.schema.json. */
export type ValidationCode =
  | 'schema.required'
  | 'schema.additionalProperties'
  | 'schema.type'
  | 'schema.const'
  | 'schema.enum'
  | 'schema.pattern'
  | 'schema.format'
  | 'schema.minLength'
  | 'schema.maxLength'
  | 'schema.maxItems'
  | 'schema.uniqueItems'
  | 'schema.minimum'
  | 'schema.maximum'
  | 'schema.propertyNames'
  | 'input.maxNodes'
  | 'input.maxDepth'
  | 'input.maxStringLength'
  | 'input.maxCollectionSize'
  | 'input.nonJson'
  | 'input.cycle';

/** RFC 6901 pointer; validate external values against the authoritative schema. */
export interface ValidationDiagnostic {
  code: ValidationCode;
  path: string;
  severity: 'error';
  message: string;
}

export type ValidationResult =
  | { valid: true; diagnostics: [] }
  | { valid: false; diagnostics: [ValidationDiagnostic, ...ValidationDiagnostic[]] };
