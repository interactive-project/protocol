# Engine, action, result and snapshot interoperability v1

The authoritative structural contracts are the action, dispatchResult, result and snapshot definitions in interoperability.v1.schema.json (JSON Schema Draft 2020-12, local references only). Every wire object is bounded plain JSON; functions, vendor objects, promises, AbortSignal and services belong only to the trusted live host ports. The existing ActivitySpec envelope is unchanged.

## Identities and action dispatch

Actions carry protocolVersion and actionVersion 1.0.0, a UUIDv4 id, activityId, sessionId, an optional attemptId, namespaced type, a nonnegative safe-integer sequence and an opaque JSON payload. The selected domain library owns payload validation for each action type. Activity identity describes the authored document; session identity describes one runtime instance; attempt identity describes an assessed run within it. Hosts create and authenticate these identities. IDs and capabilities supplied by content are not permission grants.

Core must bind activity/session/attempt to its current instance before dispatch and validate the action payload with the engine. Sequence starts at zero and advances only after an accepted action; accepted dispatch returns the new revision. An exact duplicate ID and identical action may return the previously recorded outcome; a reused ID with different content is invalid. Queued dispatches are serialized. Rejection is atomic and changes no state/revision. Registry resolution and host policy occur before execution.

Accepted dispatch contains status accepted, actionId and revision. Rejection contains status rejected, actionId, a stable action.* code, an RFC 6901 pointer and a safe bounded message. Codes distinguish unknown/invalid actions, stale sequence, identity mismatch, busy initialization, disposed instances, permission denial and unsupported capabilities. The adapters expose interop.schema, interop.identity and interop.version validation diagnostics and existing input.* preflight diagnostics. Producers must use safe descriptions rather than input values or native exception strings.

## Evaluation results and partial credit

Results carry protocolVersion/resultVersion 1.0.0, activity/session/optional attempt identity, the evaluated revision and at most 1,000 opaque evidence references. Each evidence reference has a stable absolute URI id and type; it is resolved by an authorized host catalog, never fetched implicitly. Store private answers and grading material behind the evidence service, outside public result references.

- completed means assessment finished and requires score with scale normalized and value between 0 and 1 inclusive. Zero is a completed incorrect assessment; fractions represent partial credit and 1 is full credit. Domain scoring must document its normalization before emitting this contract.
- pending means no final assessment is available and requires pendingReason initialization, effects, evaluation or response. It carries no score. A pending asynchronous simulation is not a failed or unevaluable activity.
- failed means an attempted evaluation could not finish, with failure code evaluation.failure, evaluation.timeout or evaluation.cancelled and a safe message. It is not a completed zero score.
- unevaluable means there is no assessment to perform in this context, with reason unassessed, unsupported, not-ready or not-allowed. An unassessed whiteboard is represented this way and carries no score.

Each branch forbids other branches' fields. JSON/schema validation checks score bounds and finite values; TypeScript projects structure only. Asynchronous evaluation captures a revision. Core must reject or discard stale evaluation completion after dispatch, restore, reset or disposal changes that revision/session/attempt; no old result may overwrite current state.

## Snapshot identity and versions

Snapshots carry protocolVersion/snapshotVersion 1.0.0, an activity identity (id, type, activitySchemaVersion and contentDigest), engine id/stateVersion, session id/optional attemptId/revision and a JSON state object. The domain engine owns state semantics and must validate them before restoring. Versioning the envelope does not replace versioning domain state.

contentDigest is SHA-256 of the UTF-8 bytes of protocol-json-v1 canonical serialization of the complete authored ActivitySpec: object keys sorted by UTF-16 code-unit order, arrays in authored order, strings and finite numbers encoded using ECMAScript JSON serialization, no Unicode normalization, and negative zero encoded as zero. Numeric-looking object keys must also use the prescribed lexicographic order. canonicalJson and activityDigest provide a browser-neutral reference using a host Web Crypto provider. A serializer in another language must match these rules and advertised numeric ranges.

Changing the authored config, metadata, extensions or identity changes the digest. Before restore, Core must supply all expected activity and engine fields to validateSnapshot, check supported versions and validate domain state; an omitted expected field makes that adapter structural-only for the field, not a restore authorization. A snapshot cannot select an alternate engine, activity, user or driver. Session/attempt adoption is an explicit authorized host choice, not implicit trust in the snapshot.

Optional drivers use reverse-DNS namespaced keys and independently declared driverVersion, stateVersion, encoding json and plain JSON data. Native driver state must be converted to a declared JSON representation and tagged by its owner. These extensions cannot replace common identity fields or contain live handles, provider credentials or executable values. Hosts resolve registered trusted drivers independently and reject incompatible required state; optional extensions may be preserved for round trips. Binary/native resume guarantees and migrations belong to those drivers and protocol #6.

## Live engine port and asynchronous behavior

EngineDriver.create(ActivitySpec, EngineContext) returns an EngineSession or a promise for it. The context contains trusted host-created session/attempt identities, an optional AbortSignal and host services. All methods are MaybePromise, allowing sync headless engines and asynchronously initialized drivers through the same host await path.

| Method | Contract |
| --- | --- |
| create | Validate config, establish initial state and await required initialization before accepting actions. Surface initialization failure explicitly. |
| dispatch | Validate action identity, sequence and domain payload; return accepted/rejected atomically. Core serializes calls and records the accepted revision. |
| evaluate | Return a result for a captured revision. Long-running work reports pending until final resolution; errors/cancellation use the failed branch when assessment was attempted. |
| serialize | Return a consistent snapshot of committed state and declared driver portions, after the current transaction. No promises, timers, sockets or in-flight callbacks are serialized. |
| restore | Validate the full identity/version/digest/state contract before replacing state. Failure leaves the current state intact. Reinitialize trusted asynchronous drivers and cancel/suppress old effect completions. |
| dispose | Cancel work, release resources and reject future dispatch; repeated disposal must be safe. |

Core owns lifecycle, serialization of dispatches, cancellation, stale-result suppression and effect policy. Engine effects use host-supplied services and a signal, not data-supplied code. Accepted state changes may schedule controlled effects; assessment stays pending while they are required. Restart/resume guarantees require explicit driver support, and nonresumable in-flight effects must not be silently replayed. A new session cannot dispatch during required initialization. Contracts do not make network calls or grant execution/resource access.

## Fixtures, verification and compatibility

The assessed quiz fixtures show an accepted answer, normalized 0.5 partial credit, evidence references and a matching authored snapshot. The whiteboard is explicitly unassessed. The simulation is pending asynchronous initialization. All three include activity envelopes and real SHA-256 authored digests; their opaque domain configs/state do not claim an executable engine release.

Run npm test. JavaScript and independent Python validators agree on 21 valid/invalid action, dispatch, result and snapshot fixtures. Additional tests cover identity/attempt/version binding, digest mismatch, canonical numeric/Unicode key order, JSON/resource preflight, nonmutation, round trips and real Node Web Crypto digest verification. Type consumers check package exports and synchronous/asynchronous engine ports.

This separately versioned contract adds optional package entry points without changing ActivitySpec v1 or validation-result v1. Compatibility decision: interactive-project/improvement-proposals/decisions/protocol-interoperability-v1.md. No authored-document migration is needed. No Core release or concrete engine/host implementation is claimed; those consumers must implement and test these lifecycle/effect rules and advertise compatibility before release. Unsupported score scales, protocol/snapshot versions, vendor objects and unversioned driver state fail explicitly.
