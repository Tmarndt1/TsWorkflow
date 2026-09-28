---
"ts-workflow": major
---

Expand the public workflow API with package-root cancellation controls and builder types, `defineWorkflow` for closure-based definitions, numeric timing values, and synchronous or thenable step results.

Built-in control failures now use `WorkflowError` objects with stable `WorkflowErrorCode` values instead of string rejections. Required input arguments and conditional branch inputs/outputs are checked more accurately. Timing values must be finite numbers, and `ICancellationToken` now includes `throwIfCancelled`.

Existing workflow subclasses, asynchronous steps, and callback timings remain supported. See `docs/migration.md` for migration details.
