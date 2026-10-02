import { selectLocalizedText, type ContentRef, type AssetRef, type LocalizedText } from '@interactive-project/protocol/content';
import { validateSharedContent } from '@interactive-project/protocol/validation/shared-content';
const text: LocalizedText = { kind: 'localized-text', schemaVersion: '1.0.0', defaultLocale: 'en', translations: { en: { text: 'Prompt' } } };
const ref: ContentRef = { kind: 'content-ref', schemaVersion: '1.0.0', id: 'urn:content:prompt', plainText: text };
const asset: AssetRef = { kind: 'asset-ref', schemaVersion: '1.0.0', id: 'urn:asset:one', mediaType: 'image/svg+xml' };
const selection: {text: string; locale: string; direction: 'ltr'|'rtl'|'auto'} = selectLocalizedText(text, ['en-US']);
const result = validateSharedContent(ref);
if (!result.valid) { const code: string = result.diagnostics[0].code; void code; }
// @ts-expect-error Shared references cannot embed framework components.
const invalidRef: ContentRef = { ...ref, component: () => null };
// @ts-expect-error Concrete content variants are not a shared reference kind.
const invalidKind: ContentRef = { ...ref, kind: 'markdown' };
void [asset, selection, invalidRef, invalidKind];
