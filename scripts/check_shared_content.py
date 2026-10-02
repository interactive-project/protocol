"""Independent structural schema conformance; local registry, no remote retrieval."""
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource
ROOT = Path(__file__).resolve().parent.parent
schema = json.loads((ROOT / 'schemas/shared-content.v1.schema.json').read_text())
Draft202012Validator.check_schema(schema)
def deny_remote(uri):
    raise ValueError('Remote schema resolution is disabled')
registry = Registry(retrieve=deny_remote).with_resource(schema['$id'], Resource.from_contents(schema))
validator = Draft202012Validator(schema, registry=registry, format_checker=FormatChecker())
manifest = json.loads((ROOT / 'fixtures/shared-content/conformance.json').read_text())
for entry in manifest:
    data = json.loads((ROOT / 'fixtures' / entry['file']).read_text())
    assert validator.is_valid(data) == entry['schemaValid'], entry['file']
print(f"Python shared content: {len(manifest)} structural fixtures passed. Locale/asset semantics are separate adapter checks.")
