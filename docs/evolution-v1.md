# Schema evolution, migration and release compatibility v1

Wire versions and npm package versions are distinct. Every serialized spec, event, action, result and snapshot requires its owning contract's exact advertised version; no semver range inference is allowed. Domain config, engine state and driver state have independent versions. The current published schema assets accept only protocol 1.0.0; they do not promise acceptance of future minor versions. Existing schemas and schema IDs are immutable for a version: changed wire validation gets a new version and stable schema ID, while old assets remain resolvable offline. A package patch may fix an implementation to match an unchanged contract; a package minor may add an explicit version adapter without claiming older readers accept new data.

## Compatibility is directional and behavioral

A change is compatible only for a named producer/consumer pair and operation with conformance evidence. Merely allowing both JSON shapes is insufficient when interpretation changes. New optional data is backward-compatible only inside a declared opaque preservation boundary; the current closed top-level envelopes reject new fields. A new required field, enum variant, constraint or meaning is breaking for affected consumers even if called a minor update. Changes to valid score/evaluation meaning, event ordering, action idempotency or restore guarantees are breaking semantics and require a new contract version/compatibility decision.

| Contract | Compatible example under current declared boundaries | Breaking example |
| --- | --- | --- |
| Spec | Add org.example/note JSON in optional extensions; older consumers ignore its meaning and preserve it | Rename config fields without a domain version; add a top-level field to the closed envelope; require a new capability |
| Event | Preserve an unknown optional extension in a future event contract explicitly defining that boundary | Change replay order, delivery meaning, identity fields or add a new event kind an exhaustive consumer cannot handle |
| Action | Change documentation without changing payload interpretation; owner-approved optional opaque payload data when its domain contract explicitly allows it | Change sequence ordering, action meaning, required payload or rejection codes for exhaustive consumers |
| Result | Add evidence references already permitted by the schema | Change normalized 0..1 scale to percentages, reinterpret pending as zero score, add an unhandled result status |
| Snapshot | Add data inside an existing driver's declared opaque preservation boundary with unchanged restore semantics | Change engine state encoding/version, digest algorithm, authored content identity or resume guarantee without an explicit adapter |

Events have no implemented contract here yet. Examples for events are requirements for events#1/#2/#3, not a release compatibility claim. Adding a new required capability is operationally breaking even if the enclosing JSON schema accepts it.

## Optional extensions and required behavior

Unknown optional namespaced spec extensions are semantically ignored, retained as JSON and exported intact, including nested arrays, null, false and ordinary keys such as __proto__. They never register providers or authorize host access. Editors/migrators must preserve opaque extension values; they must not rebuild a document from known fields and discard the rest. Actions/results/events currently have no generic extensions field: reject invented fields unless the particular domain-owned payload/schema has a documented preservation boundary.

Required capabilities are explicitly declared in the trusted catalog and semantic validation requirements described in generation-v1.md. An unsupported capability, missing required driver or absent host permission rejects before engine creation. Never downgrade collaboration, execution, assessment or resumability silently. Snapshot driver entries are independently versioned required restore state, not ignorable optional spec extensions. An unknown required driver/state version rejects restore; a driver may advertise optional nonessential state only through its own documented version contract.

## Explicit migration contract

A registered migration identifies an owner, exact sourceVersion, targetVersion, contract kind, schema IDs and preservation/loss policy. A supplied migration path is ordered and bounded; each adjacent edge must match exactly, with no repeated version, automatic fallback, URL retrieval or unregistered code. A host selects trusted code and requests the exact target. Reject unsupported sources/targets; do not simply overwrite a version string.

Validate source structure and semantics before each edge, then the target structure and semantics after it. Validation uses trusted offline validators for that exact version. The entire input and original artifact remain available; failures return no partially migrated document. Migrations cannot execute activities, access network/services or change logical identity and host permissions. Validate the complete result again before creating an engine, deriving a new authored digest or restoring compatible state. Authored content changes require a new digest and coordinated snapshot migration, never suppress an old digest mismatch.

The optional evolution adapter implements a stricter lossless-only reference: bounded isolated JSON copies, synchronous trusted validators/transforms, exact ordered version checks, source/target validation and an inverse transform that must reconstruct the prior document with deep JSON equality (including all unknown extensions). A host must also review identity and semantics in its validators. Successful inverse reconstruction demonstrates retained data, not behavioral equivalence; owners still supply fixture/review evidence. It rejects lossy migrations rather than guessing or concealing loss. Intentional destructive conversion must use a separately reviewed workflow with explicit user choice, original artifact retention, a path-level loss report and documented recovery; it cannot be advertised as a lossless migration.

No actual v0/v2 protocol schema or production migration exists. The test-only 0.0.1 → 0.0.2 → 0.0.3 config rename is clearly marked as illustrative. It exercises acceptance, unknown optional preservation, absent paths, mismatched versions, invalid source/target, thrown/async transforms and deliberate loss. There is no migration needed for the additions in protocol#2–#6 because their existing wire schemas remain unchanged.

## Planned cross-library fixture catalog

catalogs/conformance-plan.v1.json enumerates all six domain engines across headless, DOM, React, Vue and Svelte (30 suites). Every entry is planned, with an owning implementation issue and required behavioral cases. These entries do not claim tests run for unavailable engines or UI hosts. Domain owners must supply valid, invalid and boundary configurations plus action traces, result semantics, snapshot/restore and required driver/permission fixtures. Hosts run identical authored fixtures and compare observable engine results while separately verifying mount/update/dispose, accessibility, keyboard behavior and absence of serialized native objects. Browser visual behavior cannot be certified by a headless schema test.

Existing shared fixture catalogs (fixtures/conformance.json, shared-content, interoperability and generation) are runnable now in JavaScript/TypeScript and independent Python validators. Planned suites reuse them and add actual domain/host adapters. A missing suite or unsupported combination stays explicitly planned/unsupported; it never becomes a passing release gate by omission.

## Advertised matrix and release gate

catalogs/compatibility.v1.json separates implemented repository contracts from planned components. Protocol 0.1.0 implements exact spec/action/result/snapshot 1.0.0 contracts; events and domain/Core/host releases advertise no supported versions yet. No npm publication or cross-library runtime support is asserted. Each component must list exact supported versions per contract, its package version, limitations and implementation/release status. An empty list means unsupported, never wildcard compatibility. Documentation uses the same matrix; release owners update it with evidence.

For each proposed release:
1. Freeze immutable schema IDs, exact supported version lists, oldest/newest support endpoints, domain/engine/driver versions and explicit unsupported combinations. Sort three-part version tuples numerically, not lexicographically.
2. Run all required suites for every advertised producer/consumer/host combination at the oldest AND newest advertised contract versions. If one version is supported, the same version is both endpoints. Include every intermediate supported version for migration edges and regression fixtures.
3. Validate generated data structurally/semantically, permission/capability rejection, action/result identity and statuses, optional extension preservation, snapshot digest/version rejection and restore guarantees. Require real browser/accessibility checks for UI host claims, not only JS/Python schema agreement.
4. For new migration edges run source/target and lossless roundtrip checks, malformed/boundary inputs and original artifact recovery. Unsupported required behavior must explicitly reject. Reject a removed supported version until a documented breaking release and migration/retention decision is published.
5. Attach exact commit, dependency lockfile versions, suite IDs, contract endpoints, CI URLs and test conclusions. A skipped, planned, missing, flaky or failed required suite blocks release. Coordinate shared changes through improvement-proposals and publish compatibility/migration notes before package publication.

The repository npm test verifies that the planning catalog covers all 30 combinations, unsupported matrix entries remain empty, implemented exact versions match current schemas, unknown spec extension data roundtrips and lossless migration reference cases pass. It does not certify future engine or framework implementation. Compatibility decision: improvement-proposals/decisions/protocol-evolution-v1.md.
