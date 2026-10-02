# Interactive Project Protocol

Portable, framework-neutral JSON contracts shared by Interactive Project activities.

- [ActivitySpec v1 contract](docs/activity-spec-v1.md)
- [ActivitySpec v1 JSON Schema](schemas/activity-spec.v1.schema.json)
- [Portable validation and offline resolution](docs/validation-v1.md)
- [Validation result JSON Schema](schemas/validation-result.v1.schema.json)
- [Shared content, localization, accessibility and assets](docs/shared-content-v1.md)
- [Engine, action, result and snapshot interoperability](docs/interoperability-v1.md)
- [Capabilities, generation catalogs and ordered validation](docs/generation-v1.md)
- [Fixtures and limits](fixtures/README.md)

The protocol owns the common envelope and metadata. Each activity domain library owns its config schema and validation. The schema assets have no runtime dependencies. The optional Node.js validation adapter uses Ajv and ajv-formats as optional peers. The protocol does not depend on Interactive Project Core, execution drivers, UI frameworks, styling systems, or validation libraries.
