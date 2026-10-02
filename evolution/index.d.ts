import type { JsonValue } from '../types/activity-spec.js';
export interface MigrationEdge {
  sourceVersion: string; targetVersion: string;
  validateSource(value: JsonValue): boolean;
  validateTarget(value: JsonValue): boolean;
  forward(value: JsonValue): JsonValue;
  reverse(value: JsonValue): JsonValue;
}
export interface MigrationRequest {
  sourceVersion: string; targetVersion: string; path: readonly MigrationEdge[];
  getVersion(value: JsonValue): string;
}
export type MigrationCode = 'migration.path' | 'migration.input' | 'migration.source' | 'migration.target' | 'migration.transform' | 'migration.loss';
export type MigrationResult = { valid: true; value: JsonValue; sourceVersion: string; targetVersion: string } | { valid: false; diagnostics: [{ code: MigrationCode; path: ''; severity: 'error'; message: string }] };
export declare function migrateLossless(input: unknown, request: MigrationRequest): MigrationResult;
