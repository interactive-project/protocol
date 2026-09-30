"""Independent Draft 2020-12 validation; never fetch a remote schema."""
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource
from referencing.exceptions import Unresolvable

ROOT = Path(__file__).resolve().parent.parent
schema = json.loads((ROOT / 'schemas/activity-spec.v1.schema.json').read_text())
Draft202012Validator.check_schema(schema)
def deny_remote(uri):
    raise ValueError('Remote schema resolution is disabled')
registry = Registry(retrieve=deny_remote).with_resource(schema['$id'], Resource.from_contents(schema))
assert 'uri' in FormatChecker.checkers, 'Install scripts/requirements.txt to enable URI assertions'
validator = Draft202012Validator(schema, registry=registry, format_checker=FormatChecker())
manifest = json.loads((ROOT / 'fixtures/conformance.json').read_text())
for entry in manifest:
    data = json.loads((ROOT / 'fixtures' / entry['file']).read_text())
    assert validator.is_valid(data) == entry['valid'], entry['file']


try:
    Draft202012Validator({'$ref': 'https://untrusted.invalid/schema.json'}, registry=registry).is_valid({})
except Unresolvable:
    pass
else:
    raise AssertionError('Remote references must fail closed')

print(f"Python: {len(manifest)} shared fixtures passed with jsonschema.")
