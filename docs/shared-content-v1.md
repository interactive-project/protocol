# Shared content extension points v1

The authoritative structural contract is [shared-content.v1.schema.json](../schemas/shared-content.v1.schema.json), JSON Schema Draft 2020-12. Its logical $id is a local registry key, not a request to fetch GitHub HTML. All references are local. Shared shapes are ContentRef, LocalizedText, Accessibility and AssetRef. Each carries schemaVersion 1.0.0, independent of the ActivitySpec envelope and domain config versions.

## Dependency and composition

Protocol defines references and shared metadata. content-node defines concrete text, markdown, math, image, code, audio and video variants and validates their content data. Protocol must not import content-node, Core, a renderer, vendor objects or UI components.

Domain config schemas reference the shared schema definitions wherever they accept content, localized text or asset references. They register schema files explicitly before validation; arbitrary remote loading is disabled. An ActivitySpec v1 envelope is unchanged and continues to treat config as opaque JSON. These optional conventions add no required envelope fields or new metadata fields.

A ContentRef contains kind content-ref, schemaVersion, an absolute URI id and a required LocalizedText plainText alternative. Its optional accessibility object uses the same localization shape. IDs are stable opaque identifiers, scoped to the authored document or an explicitly supplied host catalog. The host resolves an ID against a trusted catalog and validates the concrete variant through content-node. Data never supplies a resolver, JavaScript function or provider identity. Unknown IDs and unsupported concrete variants produce the plainText alternative or an explicit recoverable unsupported state; they never trigger arbitrary URI fetching. Exporters must preserve IDs and include any necessary portable catalog rather than rely on temporary memory/object URLs. Concrete recursive composition and its bounds are owned by content-node.

## Localization and direction

LocalizedText contains kind localized-text, schemaVersion, a canonical defaultLocale and a map of translations. Each translation has nonempty plain text, at most 4,000 Unicode code points, and optional direction ltr, rtl or auto. There are at most 64 translations. Translation keys and defaultLocale are canonical Unicode BCP 47 tags supported by Intl.getCanonicalLocales; the default must exist. Unsupported grandfathered/private-only tags fail explicitly. Locale registry/ICU differences must be included in consumer compatibility checks. Do not accept underscores or compare canonical aliases as different locales.

The structural schema checks shape and size. validateSharedContent additionally checks canonical locales, the presence of the default translation and asset locator semantics. These checks are a separate semantic stage: a structurally valid fixture may still be rejected. Structural outcomes are checked independently in JavaScript and Python; the reference semantic adapter and selector are checked in JavaScript.

selectLocalizedText consumes already validated plain JSON and a host-provided ordered list of requested locales. For each requested locale it tries the canonical full tag, then the base tag without Unicode extensions, then successively less specific base subtags. It tries the next host preference only after those candidates. Finally it selects defaultLocale. It never guesses a sibling region or depends on a global mutable language. Output preserves the chosen locale and declared direction, defaulting missing direction to auto. The host must attach language and direction metadata to its rendered content and apply an appropriate bidirectional isolation strategy. The selector does not produce markup or infer UI accessibility.

## Accessibility

Accessibility contains kind accessibility, schemaVersion and optional localized instructions, label, description and equivalentExperience. The equivalent experience gives meaningful nonvisual instructions or information using the same localization/fallback rules, rather than a vendor-specific object. Domain schemas and authoring tools determine which fields are required for a particular interaction and must ensure useful alternatives are supplied.

These fields describe authored intent. Their presence does not establish WCAG conformance. Hosts still own semantics, keyboard navigation, focus, announcements, media controls and testing with assistive technology. Missing or unsupported rich content must retain a readable plain-text experience. Do not expose private grading keys as accessibility descriptions.

## Assets, attribution and integrity

AssetRef contains kind asset-ref, schemaVersion, an absolute URI id and a bare MIME mediaType. An optional uri is a durable HTTPS or URN locator without user information, query parameters or fragments. Temporary blob/data URLs, executable schemes and signed credential-bearing URLs are unsupported. A URN is resolved by the host catalog; no resource is fetched automatically. Keep provider tokens and authorization outside exported data. An arbitrary value hidden in a path cannot be proven credential-free by schema validation: hosts and exporters must use stable public identifiers and inspect their supplied catalog.

Optional integrity contains algorithm sha256 and a lowercase 64-hex-digit digest of the asset bytes. The host must verify actual bytes before use when integrity is present, reject mismatches and apply its independent origin, MIME, byte-size and permission limits. Integrity metadata alone does not prove that bytes were verified or make an origin trusted. Host-required integrity can reject an otherwise structurally valid reference without escalating activity permissions.

Optional attribution records creator, title, absolute license URI and source URI. Hosts must preserve attribution on export and present it where appropriate; an attribution string does not establish legal rights. Fixture digests demonstrate shape only and do not describe downloadable verified asset bytes.

## Examples and verification

The quiz, flashcards and whiteboard activity fixtures in fixtures/shared-content reuse an identical ContentRef and LocalizedText. The whiteboard nests both activities. Domain layouts are illustrative until their owning domain schemas exist; they are valid shared ActivitySpec envelopes, not a claim of executable quiz/whiteboard support.

Run npm test. The suite checks 14 shared-content structural and semantic fixtures, independent Python structural outcomes, fallback precedence, RTL metadata, invalid locales, missing defaults, unsafe asset locators, cyclic/accessor input, nonmutation, nested round trips and schema/type consistency through actual package exports. The browser-neutral content selector uses only Intl and plain data; the optional Node validation adapter uses Ajv.

Compatibility decision: this adds a separately versioned optional contract and package entry points while leaving ActivitySpec v1 and its portable validation result unchanged. See interactive-project/improvement-proposals/decisions/protocol-shared-content-v1.md. No authored document migration is needed. Enforcing these conventions on formerly opaque configs requires a domain schema/version decision. Core/host compatibility and future concrete content variants remain consumer integration work.
