# Schema publication and portable validation v1

## Authoritative contract and offline resolution

The public wire contract is JSON Schema Draft 2020-12. The package exports both
`schemas/activity-spec.v1.schema.json` and `schemas/validation-result.v1.schema.json`.
Their `$id` values are stable logical identifiers under
`https://github.com/interactive-project/protocol/blob/main/schemas/` followed by the
filename. Identifiers are registry keys, not instructions to fetch GitHub HTML.
Distribute the actual JSON files with the consumer and register them by `$id`.
All current `$ref` values are document-local fragments. Never resolve an arbitrary
URI supplied by an activity or enable Ajv `loadSchema`/`compileAsync`. Unknown
references fail closed. Consumers must not interpret activity data as schemas.
Changing accepted ActivitySpec values requires the compatibility decision described
in [ActivitySpec v1](activity-spec-v1.md#version-boundaries), coordinated through
interactive-project/improvement-proposals; this publication adds no envelope fields
or changes to the existing accepted envelope values.

The optional Node.js adapter uses Ajv 8 and ajv-formats 3, with Draft 2020-12,
strict schema checks, URI format assertions, all-errors reporting and no mutation
(no coercion, default injection or property removal). Install both optional peers
when importing the adapter. Reading the schema assets requires no validator library.

```js
import { validateActivitySpec } from '@interactive-project/protocol/validation';
const result = validateActivitySpec(activity);
if (!result.valid) console.log(result.diagnostics);
```

This adapter validates the shared envelope only. Dispatch domain config validation
to the library owning `type` and `activitySchemaVersion` after envelope validation.
Never execute an unsupported type/version. A successful envelope check does not
prove domain validity or execution support.

## Portable diagnostics

The normative output shape is `validation-result.v1.schema.json`. Success is
`{"valid":true,"diagnostics":[]}`. Failure has `valid:false` and at least one diagnostic:

```json
{
  "valid": false,
  "diagnostics": [{
    "code": "schema.required",
    "path": "/metadata/title",
    "severity": "error",
    "message": "A required property is missing."
  }]
}
```

`path` is an RFC 6901 JSON Pointer, with the empty string identifying the root;
`~` becomes `~0` and `/` becomes `~1`. Missing and additional properties point to
the property itself, even when missing. Invalid property names also point to that
property. Array indexes use decimal tokens. `code` and `path` are machine-readable;
messages are safe static descriptions, omit input values and validator internals,
and are not stable identifiers or localization keys. Severity in v1 is `error`.

| Codes | Meaning |
| --- | --- |
| `schema.required`, `schema.additionalProperties`, `schema.propertyNames` | Missing, unknown or invalidly named property |
| `schema.type`, `schema.const`, `schema.enum` | Wrong value type or disallowed value |
| `schema.pattern`, `schema.format` | Invalid string shape or URI format |
| `schema.minLength`, `schema.maxLength` | String outside schema length limits |
| `schema.maxItems`, `schema.uniqueItems` | Too many or duplicate array entries |
| `schema.minimum`, `schema.maximum` | Number outside schema bounds |
| `input.nonJson`, `input.cycle` | Unsupported runtime value or cycle |
| `input.maxDepth`, `input.maxCollectionSize`, `input.maxStringLength`, `input.maxNodes` | Input resource budget exceeded |

Adapters map validator keywords into these codes. They MUST NOT pass through native
validator messages, schema paths, or rejected values. Ajv's propertyNames wrapper
and pattern failure can both appear at the same pointer. Different validators may
report different redundant failures; identical acceptance/rejection is required,
not identical native error counts. The Node adapter deduplicates identical output
entries and sorts by pointer then code using code-unit order. Runtime preflight
returns the first error and stops before invoking Ajv.

## Input resource policy

These budgets are consumer safety policy, separate from the authored wire schema.
A document may satisfy the schema yet exceed a consumer's advertised input budget.
The reference adapter uses these fixed limits, applied before schema evaluation:

| Budget | Inclusive maximum |
| --- | --- |
| Depth | 64 edges from root (root depth is zero) |
| Collection size | 10,000 items per array or own properties per object |
| String length | 1,000,000 Unicode code points per string or property name |
| Total values visited | 100,000, including root and repeated references |

The tighter metadata limits in ActivitySpec still apply. Consumers of encoded JSON
MUST limit input to 8 MiB of UTF-8 before parsing, reject duplicate object names,
and enforce depth during parsing when their parser allows it. The adapter takes
already parsed data and cannot recover duplicate names or the original byte count.
Callers own this parse boundary; `JSON.parse` alone cannot detect duplicate names.
Object member order is immaterial. Only plain objects (including null-prototype
objects), dense arrays and finite JSON primitives are accepted. Accessors,
non-enumerable data, symbol keys, cycles and executable/object instances are
rejected before Ajv or serialization; accessors are never invoked. Shared acyclic
references are allowed and visited once per occurrence. Do not pass untrusted live
objects or proxies: use a bounded JSON parser; JavaScript reflection can trigger
proxy traps. The adapter is for plain data, not a sandbox for executable objects.

## TypeScript and Zod projections

`types/activity-spec.d.ts` and `types/validation-result.d.ts` are optional structural
TypeScript projections. Import `ValidationResult`, `ValidationDiagnostic` and
`ValidationCode` from the validation or types entry point. The validation entry
publishes `validateActivitySpec(input: unknown): ValidationResult` and readonly
resource policy declarations; result narrowing guarantees an empty success list
or at least one failure diagnostic. CI checks a consumer against the actual
package exports, including rejected unknown codes and inconsistent result shapes.
CI also checks field names, optionality, literals, enums, arrays and primitive types against the
schema, and compiles it in strict mode. Future generators MUST take the JSON Schema
as their input and run this consistency gate; generated types cannot become a
second authority. TypeScript cannot faithfully express UUID/version/namespace
patterns, URI formats, code-point lengths, numeric bounds, finite numbers, unique
arrays, exact object keys, JSON runtime graphs or resource budgets. External values
MUST still pass schema validation; a cast or successful compilation is insufficient.

Zod is optional and is not a dependency of these schemas or this adapter. A Zod
integration must be generated from or reviewed against this contract, use strict
objects at closed levels, preserve open configs/extensions and avoid coercion,
defaults, stripping and transforms. Constraints not faithfully projected must be
checked by the authoritative validator as a final refinement, forwarding portable
diagnostics. In particular, JavaScript string length counts UTF-16 code units;
a naive Zod `.max(160)` differs from JSON Schema's Unicode code points. Do not
approximate URI assertions or silently omit unsupported keywords. CI for any new
projection must run the same conformance manifest; unsupported mappings must fail
generation explicitly or be documented and delegated to the schema validator.

## Verification and compatibility evidence

Run `npm ci`, install `scripts/requirements.txt`, and run `npm test`. The common
`fixtures/conformance.json` manifest covers all six activity types, valid/invalid
examples, Unicode title boundaries, description/identifier limits, duplicate URIs,
malformed absolute URIs, unknown fields and unsupported versions/types. Ajv and
Python jsonschema independently check every declared outcome. Additional JavaScript
checks cover runtime values, budget boundaries, safe diagnostics, escaped pointers
and schema/type consistency. CI runs both validators. Python uses an explicit local
registry with remote retrieval denied and URI format assertions enabled.

A minimal fixture is a headless authored document and round-trips through ordinary
JSON transport; it does not establish host execution. No Core or domain consumer
version is available in this repository, so no Core compatibility range, runnable
host integration or snapshot migration is claimed. Those integration checks remain
required in the consuming repositories before release/issue closure. This package
version is independent of `protocolVersion` and `activitySchemaVersion`. No document
migration is needed because the ActivitySpec schema is unchanged; introducing new
accepted wire values or new diagnostic codes requires an explicit contract version
and compatibility review. Publication here means distributable package contents;
registry upload and downstream host support are separate release work.
