# ActivitySpec v1 fixtures

The fixtures under this directory are protocol-envelope fixtures. They exercise the shared schema and do not claim that the domain-owned `config` is executable or valid for an activity engine.

For each of the six v1 activity types:

- `<type>/minimal.json` is a valid envelope with only required metadata.
- `<type>/complete.json` is a valid envelope with every optional metadata field and an extension.
- `<type>/invalid.json` is an invalid envelope; the filename's corresponding bullet gives its expected failure.

| Type | Invalid fixture demonstrates |
| --- | --- |
| `interactive-project/quiz` | Malformed activity schema version |
| `interactive-project/flashcards` | Config is not an object |
| `interactive-project/code` | Required title is missing |
| `interactive-project/simulation` | Estimated duration exceeds one week |
| `interactive-project/diagram` | Extension key has no reverse-DNS namespace |
| `interactive-project/whiteboard` | Unknown top-level property |

`quiz/invalid-uri.json` is an additional invalid envelope demonstrating that concept identifiers cannot be relative references.

Boundary review evidence:

| Boundary | Accepted | Rejected |
| --- | --- | --- |
| Estimated duration | 1 second in `flashcards/complete.json`; 604,800 seconds in `whiteboard/complete.json` | 604,801 seconds in `simulation/invalid.json` |
| Title length | 160 code points in `quiz/complete.json` | 161 code points (must fail the schema's `maxLength`) |
| Concept/competency identifiers | 64 unique identifiers, each at most 512 characters (schema limits) | 65 entries, duplicates, or an identifier longer than 512 characters |
| Description length | 4,000 code points (schema limit) | 4,001 code points |
| Extension namespace | `com.example/annotation` in complete fixtures | `render/annotation` in `diagram/invalid.json` |

The ActivitySpec schema only defines the outer `config` object and JSON-value domain. Empty configs in these examples are valid protocol values, not declarations that an empty quiz, simulation, or other activity is valid under its domain schema.

Runtime values such as cycles, NaN, Infinity, functions, and BigInts cannot be represented in JSON. Their rejection is documented in [the contract](../docs/activity-spec-v1.md#namespaces-unknown-fields-and-json-values); they must be checked before serialization.
