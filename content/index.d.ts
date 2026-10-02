import type { LocalizedText } from '../types/shared-content.js';
export type { LocalizedText, Accessibility, ContentRef, AssetRef, SharedContent } from '../types/shared-content.js';
export declare function canonicalLocale(locale: string): string;
export declare function selectLocalizedText(value: LocalizedText, requestedLocales?: readonly string[]): { text: string; locale: string; direction: 'ltr' | 'rtl' | 'auto' };
