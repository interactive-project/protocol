# Runtime values rejected before JSON encoding

These examples are intentionally not JSON fixtures: JSON cannot represent the invalid graph/value being shown. A producer must reject each before calling a serializer.

- Cycle: `const value = {}; value.self = value;`
- Non-finite numbers: `NaN`, `Infinity`, `-Infinity`
- Executable or non-JSON values: `undefined`, `() => {}`, `Symbol("x")`, `1n`, `new Date()`, `new Map()`, `new Set()`, `/x/`, and instances of custom classes
- Executable property behavior: objects with getters or setters

Serializers may coerce or omit some of these values. That behavior does not make them valid protocol data.
