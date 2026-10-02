/** Shared reference contracts; concrete content variants are owned by content-node. */
export interface LocalizedText {
  kind: 'localized-text';
  schemaVersion: '1.0.0';
  defaultLocale: string;
  translations: Record<string, { text: string; direction?: 'ltr' | 'rtl' | 'auto' }>;
}
export interface Accessibility {
  kind: 'accessibility';
  schemaVersion: '1.0.0';
  instructions?: LocalizedText;
  label?: LocalizedText;
  description?: LocalizedText;
  equivalentExperience?: LocalizedText;
}
export interface ContentRef {
  kind: 'content-ref';
  schemaVersion: '1.0.0';
  id: string;
  plainText: LocalizedText;
  accessibility?: Accessibility;
}
export interface AssetRef {
  kind: 'asset-ref';
  schemaVersion: '1.0.0';
  id: string;
  mediaType: string;
  uri?: string;
  integrity?: { algorithm: 'sha256'; digest: string };
  attribution?: { creator: string; title?: string; license?: string; source?: string };
}
export type SharedContent = LocalizedText | Accessibility | ContentRef | AssetRef;
