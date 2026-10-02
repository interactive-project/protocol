# Capability declarations and generated activity validation v1

generation-catalog.v1.schema.json is the authoritative structural catalog contract (Draft 2020-12, local references, no arbitrary retrieval). Catalogs have protocolVersion/catalogVersion 1.0.0 and entries keyed uniquely by an exact activity type and activitySchemaVersion. An entry gives the owning domain schemaId, all seven capability declarations, requiredCapabilities and requiredPermissions. Schema IDs are registry keys resolved through trusted pre-registered validators, never data-supplied schemas or URL fetch commands.

The package's available-generation.v1.json intentionally has no entries: no concrete domain engine/schema release is implemented yet. Test catalogs explicitly use fixture-only domain version 0.0.1 and registered fixture validators; they do not advertise production quiz/code execution. The registry/domain work must populate an actual generation catalog only after its schemas, capabilities, drivers and compatibility gates pass.

## Precise capabilities and conditional drivers

Each declaration contains supported and optional namespaced requiredDrivers. Supported describes a producer's documented behavior; a missing required driver makes that capability unavailable. An unsupported declaration cannot name nonempty driver prerequisites. A catalog with an unconditional network requirement cannot claim offline. Capabilities never grant network, execution, media, storage, collaboration membership or other host permission.

| Capability | Meaning when advertised and available |
| --- | --- |
| interactive | The engine accepts documented actions that can change activity state. Presentation alone is insufficient. |
| evaluable | The engine can produce the documented assessed result statuses and normalized scores for a supported configuration. |
| collaborative | A registered synchronization adapter preserves the domain's declared concurrent-edit semantics. This grants neither membership nor transport authorization. |
| offline | Required schema, driver and asset resources are available locally for the selected operation without network access. |
| deterministic | A declared trace reproduces under fixed supported versions, configuration, injected clock/randomness and stated numeric/environment guarantees. |
| resumable | The engine and required drivers can restore versioned snapshots within an explicitly advertised resume guarantee. |
| aiGeneratable | The exact type/schema version has an approved machine-readable schema and semantic checks suitable for generated JSON, plus required compatibility/conformance evidence. |

A host advertises registered driver IDs independently. Activity data cannot set supported flags or register drivers. Conditional support must be documented and tested by the declaring domain/driver, and the requested operation still passes host policy.

## Ordered pipeline before engine or renderer resolution

validateGeneratedActivity is an optional Node.js reference adapter using Ajv. It consumes generated text or already parsed plain JSON and a trusted GenerationContext. The pure generation/json entry provides bounded parsing/copying without Node, Ajv or UI dependencies. Context callbacks are registered trusted, synchronous, side-effect-free validation functions. They must not execute activities, fetch resources or resolve renderers while checking data.

1. Structural: enforce host input budgets, strictly parse JSON, reject duplicate decoded names and unsupported numeric values, validate ActivitySpec, find an exact catalog entry and validate config through its registered domain schema. Unsupported type/version and invalid domain shape stop here.
2. Semantic: the domain validates cross-field meaning and returns explicit permissions/capabilities required by the selected configuration. Missing, asynchronous, throwing or malformed validators fail closed with safe diagnostics. Data is an isolated deeply frozen copy; validators cannot alter it or its selected catalog entry.
3. Permission: check the union of catalog and semantic requirements against a captured host policy. Network/execution/media default to denied. A declared capability or an extension claiming authorization cannot override it.
4. Capability: require all selected capabilities and aiGeneratable; check supported declarations and every conditional registered driver. Only then may Core independently resolve an engine/renderer under its host policy.

Failures identify structural, semantic, permission or capability and carry stable generation.* or existing input.* codes, RFC 6901 pointers and safe static messages. Unknown type/version, invalid envelope/domain schema, semantic rejection, validator failure, denied permission, missing driver and unavailable capability are distinct. The adapter does not forward rejected values, native exceptions or provider credentials. Accepted output contains an isolated frozen activity and catalog entry; it grants no execution right beyond the checked host policy and does not instantiate a driver.

## Host-controlled resource and parse limits

Reference maximums are 8 MiB encoded UTF-8; depth 64 with root depth zero; 10,000 collection entries; 1,000,000 Unicode code points per string/member name; and 100,000 visited values. Host inputLimits may only tighten these ceilings. Byte counting stops once the budget is exceeded. Bounds and decoded duplicate-key rejection occur while parsing, before constructing an oversized/deep complete document. Decoded objects use null prototypes and preserve ordinary JSON keys such as __proto__ as data.

Numbers use finite ECMAScript IEEE-754 values, with integers restricted to the safe integer range in this generated-input adapter. Large exact integers/decimals must use a domain-defined string representation when necessary. This is an adapter input policy, not a change to ActivitySpec's existing wire schema. Already parsed input first passes JSON resource checks and serialized-size estimation before a complete copy is allocated. Root primitives are parseable JSON but fail the ActivitySpec envelope. Decoded host objects must be plain data, not proxies or executable objects; reflection is not a sandbox for live JavaScript. HTTP/decoder boundaries must also enforce byte limits and valid UTF-8 before providing a string.

Input budgets bound validation data. Hosts independently enforce execution time, memory, output, network origins/requests, asset bytes/MIME/integrity and other runtime resources. Activity data and catalog requirements describe needs; only the host can authorize them. Native services and credentials stay in live host context, never authored/generated/exported JSON.

## Verification and compatibility

Run npm test. Eleven accepted/rejected pipeline scenarios cover unknown types, unsupported versions/protocol, missing drivers, prohibited execution, structural/semantic ordering and content attempting to grant itself permission. Additional checks cover oversized encoded and parsed data, stricter budgets, duplicate escaped names, Unicode byte/code-point boundaries, sparse/non-JSON/cyclic/accessor values, unsupported numbers, frozen copies, validator errors/promises, catalog contradictions and policy capture before callbacks. Python independently verifies catalog structural fixtures; TypeScript consumers and schema/type consistency checks cover the public catalog and adapter, including headless declarations.

Compatibility decision: interactive-project/improvement-proposals/decisions/protocol-generation-v1.md. Existing ActivitySpec, portable validation-result and interoperability wire schemas remain unchanged. No authored document migration is required; generated data outside the adapter's numeric/resource policy is rejected explicitly. Actual Core/domain/host capability and execution compatibility belongs to their subsequent implementation gates. This adapter defines and tests validation ordering without claiming those not-yet-released consumers.
