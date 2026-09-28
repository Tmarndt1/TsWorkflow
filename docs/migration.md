# Public API migration

[Back to the README](../README.md)

These changes are unreleased. Existing callback timings and asynchronous steps remain supported, but structured errors and stricter type checks require attention before upgrading.

## Import public APIs from the package root

`CancellationTokenSource`, `WorkflowError`, `WorkflowErrorCode`, `defineWorkflow`, `IWorkflow`, and all fluent builder interfaces are now exported from `ts-workflow`. `Awaitable`, `Timing`, `ParallelType`, and `WorkflowRunArgs` are exported as types. Avoid importing internal `src` files. The legacy misspelled `WorkfowError` source module remains a re-export for compatibility.

## Replace string error comparisons

Built-in failures now reject with `WorkflowError` instances. Replace comparisons against string messages with `error instanceof WorkflowError` and `error.code === WorkflowErrorCode.Cancelled` (or `TimedOut`, `Expired`, `Stopped`). Messages remain descriptive; time limits are also available as `error.milliseconds`.

`CancellationToken.throwIfCancelled()` uses the same structured cancellation error instead of the old `"Cancelled!"` string. `ICancellationToken` now includes that method; custom implementations must provide it. Application-thrown errors and rejection values are propagated unchanged. An application string that happens to equal the stopped message no longer sets stopped status.

## Supply required input

With `strictNullChecks`, workflows such as `Workflow<number, string>` require `run(123)` rather than `run()`. Define no-input workflows with `void`, or explicitly include `undefined` in the input type when omission is meaningful. For example, `Workflow<number | undefined, string>` accepts either `run()` or `run(123)`.

## Accept the original input in conditional actions

Every `do()` receives the original condition input. If an earlier branch returns a string from a number, later `elseIf` and `else` actions still receive the number. Output unions track successful branch results separately. Non-exhaustive blocks preserve pass-through input; an exhaustive `else` removes that possibility. Remove unnecessary input alternatives from downstream steps after exhaustive conditions, and update any branch actions previously typed as receiving another branch's output.

The second generic parameter on conditional builder interfaces now represents accumulated successful branch outputs, excluding the potential pass-through input. An initial condition starts with `never`. Prefer inference unless you need to name these interfaces explicitly. Enable `strictFunctionTypes` as well as `strictNullChecks` to catch unsafe branch handlers.

## Optional simplifications

- Replace `.timeout(() => 5000)` with `.timeout(5000)` for fixed values. `delay` and `expire` support the same forms. Keep callbacks for values that change between runs.
- Return values directly from steps instead of wrapping them in `Promise.resolve` or `async` when there is no asynchronous work. Promises and thenables remain supported. `WorkflowStep.run()` is now typed as `Awaitable<T>`; callers invoking a step directly should `await` its result instead of assuming a `.then()` method exists.
- Use `defineWorkflow<Input, Output>(build)` to capture dependencies in a closure without subclass initialization ordering concerns. Existing workflow subclasses remain supported.

Timing values must be finite numbers. Zero and negative values still disable the corresponding delay or limit. Invalid constants throw `TypeError` when configured; invalid callback results reject at execution time.
