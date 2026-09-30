# ActivitySpec v1

This document defines the shared JSON contract for authored Interactive Project activities. The normative envelope schema is [activity-spec.v1.schema.json](../schemas/activity-spec.v1.schema.json).

## ActivitySpec envelope

An `ActivitySpec` is the authored, portable activity definition. It contains:

| Field | Required | Meaning |
| --- | --- | --- |
| `protocolVersion` | Yes | Version of this shared envelope contract. v1 is `1.0.0`. |
| `id` | Yes | Stable UUIDv4 for the logical activity. |
| `type` | Yes | Namespaced, stable activity type identifier. |
| `activitySchemaVersion` | Yes | Version of the config schema for this activity type. |
| `metadata` | Yes | Shared educational and presentation metadata. |
| `config` | Yes | Opaque JSON object interpreted by the domain library for `type`. |
| `extensions` | No | Namespaced optional data owned by extensions. Omit when empty. |

The six v1 type identifiers are `interactive-project/quiz`, `interactive-project/flashcards`, `interactive-project/code`, `interactive-project/simulation`, `interactive-project/diagram`, and `interactive-project/whiteboard`. Type identifiers are permanent names, not package names or display labels. A new type identifier requires a protocol change.

Both version fields use three non-negative dot-separated integers without leading zeroes (for example, `1.0.0`). `protocolVersion` versions this envelope and its shared semantics. `activitySchemaVersion` versions the config contract for the named type and is assigned by that type's domain library. They are independent: changing a quiz config schema does not by itself change the protocol version.

## Version boundaries

These version numbers describe separate artifacts:

| Version | Where it lives | What it versions |
| --- | --- | --- |
| Protocol version | `ActivitySpec.protocolVersion` | Shared envelope fields and their meaning |
| Activity schema version | `ActivitySpec.activitySchemaVersion` | Config schema for the selected `type` |
| Package version | Package manifest or distribution metadata | A particular published library build; it is not an ActivitySpec field |
| Snapshot version | A separate runtime/persistence snapshot envelope | Serialized progress or state format; it is not an ActivitySpec field |

A package release may contain a particular protocol implementation and one or more activity-schema implementations, but its package version MUST NOT be copied into either ActivitySpec version field. A runtime snapshot MUST carry its own `snapshotVersion`; it MUST reference the ActivitySpec identity and MUST NOT replace or mutate the authored ActivitySpec. Snapshot state shape and migration are owned by the snapshot producer and relevant domain library, outside this v1 ActivitySpec schema.

Protocol v1 is strict at the envelope and metadata levels. A patch release clarifies wording without changing accepted data. A compatible minor release may add guidance or extension conventions but MUST NOT add a new required field, alter existing meaning, or require readers to understand a new top-level field. Any change that cannot meet those conditions requires a new protocol major version. Consumers MUST reject an unsupported `protocolVersion` rather than guess its meaning. The activity library decides which `activitySchemaVersion` values it can read and whether/how to migrate configs.

## Metadata

The `metadata` object has one required field, `title`. All other fields are optional.

| Field | Shape and limit | Meaning |
| --- | --- | --- |
| `title` | Non-blank string, 1–160 Unicode code points | Human-readable activity title |
| `description` | Non-blank string, 1–4,000 Unicode code points | Human-readable description |
| `concepts` | Up to 64 unique absolute URI strings; each at most 512 characters | Stable identifiers for concepts taught or practiced |
| `competencies` | Up to 64 unique absolute URI strings; each at most 512 characters | Stable identifiers for competencies developed or assessed |
| `difficulty` | One of `introductory`, `beginner`, `intermediate`, `advanced`, `expert` | Intended difficulty band; the labels have this ordinal order |
| `estimatedDuration` | Object with `value` integer 1–604,800 and `unit` exactly `seconds` | Estimated learner time, from one second through one week |

URI identifiers are opaque references, not labels; display names belong in a vocabulary or localization layer. Metadata limits count Unicode code points, not UTF-8 bytes. Unknown metadata fields are invalid in v1.

## Config ownership and dependency direction

The protocol defines only that `config` is a JSON object. It does not define per-type config fields, defaults, domain validation, execution behavior, or rendering behavior. The domain library for the selected type owns its config schema and migrations. The protocol schema intentionally leaves config properties open so it does not import a domain engine or validation package.

Dependency direction:

```text
Activity domain library ──depends on──> shared protocol contract
Core / host / renderer ──consumes────> shared protocol contract
shared protocol contract ──depends on──> no domain library, engine, UI, styling, or validator
```

A headless producer can create and serialize an ActivitySpec without a host. A host may inspect the shared envelope and dispatch by `type`, but must use the owning domain library to interpret `config`. Parsing or validating the shared JSON does not execute code. An ActivitySpec can be transported unchanged between a headless process and a host that supports the same protocol and activity schema.

No Core package or domain config schema is present in the related repositories at this publication point. Therefore this contract declares a compatibility boundary, not a tested Core release matrix or domain-config conformance claim. The fixtures are valid or invalid against the protocol envelope only; they do not assert that an empty config is executable for a particular activity.

## Namespaces, unknown fields, and JSON values

`type` values use the reserved `interactive-project/<type>` namespace. Extension keys use a reverse-DNS authority followed by one local name, for example `com.example/render-hints`. An extension publisher MUST use a namespace it controls and MUST NOT redefine another publisher's key.

Envelope and metadata objects reject unknown fields. This makes misspellings visible and prevents silent semantic drift. `config` remains open at the shared protocol layer: its domain schema determines whether unknown config fields are accepted, rejected, or preserved. A protocol-only processor MUST preserve config values it does not interpret.

Unknown extension keys MUST be ignored semantically and preserved unchanged when an implementation round-trips the ActivitySpec. An implementation MUST NOT execute an extension value. Known extensions may be interpreted by their owning extension implementation.

Every value under `config` or `extensions` MUST be a JSON value: null, boolean, string, finite number, array of JSON values, or object with string keys and JSON values. Object member order has no meaning. Duplicate member names are invalid. Producers MUST reject cycles, NaN, positive or negative infinity, `undefined`, functions, symbols, BigInts, accessors, and non-plain executable/object instances before serialization. Values such as Date, Map, Set, RegExp, class instances, and typed arrays must be converted to plain JSON data by their owner first. This check must happen before a serializer can silently drop or coerce unsupported values.

## Unsupported and migration cases

- A consumer that does not support the protocol version MUST reject the ActivitySpec.
- A consumer that does not support the activity `type` or its `activitySchemaVersion` MUST NOT execute the config. A host may retain the opaque document for later handling.
- Unknown envelope and metadata properties are invalid; producers must not use them as private storage.
- Domain config migration is not defined here. The owning activity library must document compatible schema versions and migrations before changing its config contract.
- Snapshot state migrations are not defined by ActivitySpec v1. Snapshot producers must version and migrate their own state.
- JSON cannot directly represent cycles, executable objects, non-finite numbers, or the other rejected runtime values above. Such values are rejected before JSON encoding; they cannot be represented as ordinary JSON fixture files.
- The v1 contract contains no localized metadata shape, asset embedding rules, event protocol, execution request, or host-specific rendering hints. Use a separately versioned extension or a future protocol decision for those capabilities.

Before closing an implementation issue, reviewers should confirm the exact Core version range that consumes protocol v1, test one headless serializer and one host consumer, and document domain config support and snapshot migration behavior. Those runtime checks cannot be claimed from this schema-only repository state.
