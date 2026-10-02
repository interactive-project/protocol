"""Independent action/result/snapshot conformance using locally registered schema."""
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource
ROOT = Path(__file__).resolve().parent.parent
schema = json.loads((ROOT / 'schemas/interoperability.v1.schema.json').read_text())
Draft202012Validator.check_schema(schema)
def deny_remote(uri):
    raise ValueError('Remote schema retrieval is disabled')
registry = Registry(retrieve=deny_remote).with_resource(schema['$id'], Resource.from_contents(schema))
manifest = json.loads((ROOT / 'fixtures/interoperability/conformance.json').read_text())
for entry in manifest:
    validator = Draft202012Validator({'$ref': schema['$id'] + '#/$defs/' + entry['kind']}, registry=registry, format_checker=FormatChecker())
    data = json.loads((ROOT / 'fixtures' / entry['file']).read_text())
    assert validator.is_valid(data) == entry['valid'], entry['file']
print(f"Python interoperability: {len(manifest)} shared fixtures passed.")
