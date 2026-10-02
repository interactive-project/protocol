/** Canonical Unicode BCP 47 locale supported by the host's Intl implementation. */
export function canonicalLocale(locale) {
  if (typeof locale !== 'string' || locale.length > 128) throw new TypeError('Invalid locale identifier.');
  try { return Intl.getCanonicalLocales(locale)[0]; }
  catch { throw new TypeError('Invalid locale identifier.'); }
}

/** Consume validated plain JSON; requested locales are host preferences, in order. */
export function selectLocalizedText(value, requestedLocales = []) {
  if (value?.kind !== 'localized-text' || !Array.isArray(requestedLocales) || requestedLocales.length > 64 || !value.translations) throw new TypeError('Invalid localized text selection.');
  if (canonicalLocale(value.defaultLocale) !== value.defaultLocale || !Object.hasOwn(value.translations, value.defaultLocale)) throw new TypeError('A default translation is required.');
  for (const [locale, translation] of Object.entries(value.translations)) {
    if (canonicalLocale(locale) !== locale || typeof translation?.text !== 'string') throw new TypeError('Invalid translation.');
  }
  const candidates = [];
  for (const requested of requestedLocales) {
    const canonical = canonicalLocale(requested);
    candidates.push(canonical);
    const pieces = new Intl.Locale(canonical).baseName.split('-');
    while (pieces.length) { candidates.push(pieces.join('-')); pieces.pop(); }
  }
  candidates.push(value.defaultLocale);
  for (const locale of candidates) {
    if (Object.hasOwn(value.translations, locale)) {
      const translation = value.translations[locale];
      return { text: translation.text, locale, direction: translation.direction ?? 'auto' };
    }
  }
  throw new TypeError('A default translation is required.');
}
