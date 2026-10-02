import type { ActivitySpec, ActivityType, JsonValue } from './activity-spec.js';
import type { ValidationCode } from './validation-result.js';
export type Capability = 'interactive' | 'evaluable' | 'collaborative' | 'offline' | 'deterministic' | 'resumable' | 'aiGeneratable';
export type Permission = 'network' | 'execution' | 'media';
export interface CapabilityDeclaration { supported: boolean; requiredDrivers?: string[] }
export interface GenerationEntry {
  type: ActivityType; activitySchemaVersion: string; schemaId: string;
  capabilities: Record<Capability, CapabilityDeclaration>; requiredCapabilities: Capability[]; requiredPermissions: Permission[];
}
export interface GenerationCatalog { protocolVersion: '1.0.0'; catalogVersion: '1.0.0'; entries: GenerationEntry[] }
export interface InputLimits { maxBytes: number; maxDepth: number; maxCollectionSize: number; maxStringLength: number; maxNodes: number }
export type GenerationCode = ValidationCode | 'generation.policy' | 'generation.maxBytes' | 'generation.maxDepth' | 'generation.maxCollectionSize' | 'generation.maxStringLength' | 'generation.maxNodes' | 'generation.syntax' | 'generation.duplicateKey' | 'generation.number' | 'generation.catalog' | 'generation.unknownType' | 'generation.unsupportedVersion' | 'generation.envelope' | 'generation.domainSchema' | 'generation.semantic' | 'generation.validator' | 'generation.permissionDenied' | 'generation.missingDriver' | 'generation.capability';
export interface GenerationDiagnostic { code: GenerationCode; path: string; severity: 'error'; message: string }
export interface GenerationFailure { valid: false; stage: 'structural' | 'semantic' | 'permission' | 'capability'; diagnostics: [GenerationDiagnostic, ...GenerationDiagnostic[]] }
export interface GenerationContext {
  catalog: GenerationCatalog;
  policy?: Partial<Record<Permission, boolean>> & { inputLimits?: Partial<InputLimits> };
  availableDrivers?: readonly string[];
  validateDomainSchema(config: Readonly<Record<string, JsonValue>>, entry: Readonly<GenerationEntry>): { valid: boolean };
  validateDomainSemantics(activity: Readonly<ActivitySpec>, entry: Readonly<GenerationEntry>): { valid: boolean; requirements?: { permissions: Permission[]; capabilities: Capability[] } };
}
export type GenerationResult = { valid: true; stage: 'accepted'; activity: Readonly<ActivitySpec>; entry: Readonly<GenerationEntry> } | GenerationFailure;
