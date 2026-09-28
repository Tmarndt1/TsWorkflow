# Changelog

User-facing changes are recorded here before release.

## Unreleased

### Added

- `defineWorkflow<Input, Output>(build)` for definitions that capture dependencies in a closure.
- Package-root exports for cancellation sources, workflow contracts, fluent builder interfaces, errors, and utility types.
- Fixed numeric values for delays, timeouts, and expiration alongside existing callbacks.
- Synchronous and thenable step results through `Awaitable<T>`.
- Strict consumer tests against both CommonJS and ESM declaration bundles.

### Changed

- Shared execution and chaining implementations reduce duplicated builder logic.
- Steps without a positive delay no longer schedule a delay timer.
- Expiration lookup is cached and refreshed when the chain changes.
- Parallel step inputs are checked against the preceding output type.
- Documentation, contributor guidance, issue forms, and CI cover the current API and development checks.

### Fixed

- Unmatched conditions forward the input instead of leaving a run pending.
- Step timeouts cover execution as well as delays.
- Sequential steps receive cancellation tokens consistently.
- Failed operations clear their expiration timers.
- Unlinked step builders return their own result.

### Compatibility notes

Built-in control failures now use `WorkflowError` objects with stable `WorkflowErrorCode` values instead of strings. Required workflow inputs can no longer be omitted under `strictNullChecks`. Conditional action inputs and exhaustive output unions now match runtime behavior. Timing values must be finite numbers. See the [public API migration guide](docs/migration.md) for examples and additional typing changes.

The fluent API remains available. Direct users of internal `src` modules must update builder constructors to accept definition metadata instead of a workflow instance. The unused internal `setWorkflowStatus` helper has been removed. Parallel factories with incompatible input types now produce a TypeScript error.

This section describes unreleased work and does not imply a package has been published.
