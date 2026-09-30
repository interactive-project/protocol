# Interactive Project Protocol

Portable, framework-neutral JSON contracts shared by Interactive Project activities.

- [ActivitySpec v1 contract](docs/activity-spec-v1.md)
- [ActivitySpec v1 JSON Schema](schemas/activity-spec.v1.schema.json)
- [Fixtures and limits](fixtures/README.md)

The protocol owns the common envelope and metadata. Each activity domain library owns its config schema and validation. This repository has no runtime dependencies and does not depend on Interactive Project Core, execution drivers, UI frameworks, styling systems, or validation libraries.
