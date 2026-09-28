# Execution guide

[Back to the README](../README.md)

## Steps and parallel execution

Sequential steps receive the preceding output. Parallel steps receive the same input and cancellation token; their results retain the factory list's order, even when they finish in a different order. An empty parallel group produces an empty array.

Factories are invoked on each run. A step can return a value, promise, or thenable (`Awaitable<T>`); `workflow.run()` always returns a promise. Factory exceptions, synchronous step exceptions, and rejected promises reject the workflow. A parallel failure does not forcibly stop sibling application code that has already started.

## Conditional branches

Predicates are evaluated in declaration order, and only the first matching branch runs. With no match, the input passes through unchanged. A matching `stop()` rejects the run and sets `WorkflowStatus.Stopped`; it does not return a partial result.

Every predicate and branch action receives the original input to the conditional block, never another branch's output. Without an `else`, the output type includes the pass-through input plus all successful branch outputs. An exhaustive `else().do(...)` includes only branch outputs; `else().stop()` includes only the earlier successful outputs. Stopping branches contribute no result. Predicate exceptions reject the workflow and set its status to `Faulted`.

## Delays and deadlines

- `delay(milliseconds)` postpones the configured step or branch. Without a positive delay, execution schedules no delay timer.
- `timeout(milliseconds)` includes that step's delay and execution, but excludes subsequent steps. It is available on sequential steps, parallel groups, and conditional actions.
- `expire(milliseconds)` limits the complete workflow, including the final step. Set it after `endWith`.
- All three accept a callback instead, such as `timeout(() => configuration.timeout)`. Callbacks are evaluated at execution time and reevaluated on later runs.
- Zero or negative values disable the corresponding delay or time limit. Values must be finite numbers. Invalid constants throw `TypeError` during configuration; invalid callback results reject the run with `TypeError`.

A deadline rejects the workflow and cancels its token. The timer for a completed or failed operation is cleared. Timers cannot interrupt synchronous JavaScript that blocks the event loop.

## Cancellation

Every step receives an optional `CancellationToken` as its second argument. Long-running steps can check `token?.isCancelled()` or call `token?.throwIfCancelled()` between units of work.

Cancellation is cooperative. The workflow checks its token before and after execution and after delays. It prevents subsequent steps from starting once cancellation is observed, but cannot forcibly interrupt an already-running promise, undo side effects, or abort a network request on its own. An externally cancelled delay is observed when its timer resumes.

Import `CancellationTokenSource` from `ts-workflow`, pass it to `workflow.run(input, source)`, and call `source.cancel()` to request cancellation. `source.token.throwIfCancelled()` throws a `WorkflowError` with code `CANCELLED`. The source and token interfaces are also available from the package root.

```typescript
import { CancellationTokenSource, defineWorkflow, WorkflowError, WorkflowErrorCode } from "ts-workflow";

const source = new CancellationTokenSource();
const workflow = defineWorkflow<number, number>(builder => builder
    .startWith(() => ({ run: value => value + 1 })).delay(100)
    .endWith(() => ({ run: value => value })));

async function main() {
    const result = workflow.run(1, source);
    source.cancel();
    try {
        await result;
    } catch (error) {
        if (error instanceof WorkflowError && error.code === WorkflowErrorCode.Cancelled) {
            console.log("Cancellation observed");
        } else {
            throw error;
        }
    }
}

main().catch(console.error);
```

## Step events

`run(input, options)` accepts optional per-run observers:

```typescript
const result = await workflow.run(input, {
    cancellationTokenSource: source,
    onStarted: event => console.log("started", event),
    onCompleted: event => console.log("completed", event),
    onFailed: event => console.error("failed", event)
});
```

`onStarted` runs when a step is about to execute. `onCompleted` runs after that step resolves, and includes its elapsed `durationMs`. `onFailed` runs when a step throws, rejects, or the active run is ended by cancellation or a workflow deadline. A failure event has `origin: "step"` for an error from the step itself and `origin: "run"` when the run ends while the step is active. A step that is never selected by a condition produces no event.

Each event has:

- `runId`: an opaque ID unique to the workflow run.
- `stepId`: an opaque ID unique within that run.
- `kind`: `sequential`, `parallel`, `conditional`, or `final`.
- `timestamp`: a Unix timestamp in milliseconds.
- `durationMs` on completed and failed events.

Parallel branches emit separate events. Use `runId` and `stepId` to correlate interleaved events from concurrent runs. Event objects are frozen before delivery. Hooks are fire-and-forget: their return values may be promises, but the workflow does not wait for them. Exceptions and rejected promises from hooks are swallowed and never replace the workflow's result or error. Event callbacks are configured per run, so reusable workflow definitions do not retain observers between runs.

## Status and errors

Import `WorkflowStatus` from `ts-workflow` and compare `workflow.status` with its enum members.

| Status | Meaning |
| --- | --- |
| `Pending` | No run has started. |
| `Running` | A run is in progress. |
| `Completed` | The final result resolved. |
| `Stopped` | A matching branch called `stop()`. |
| `Faulted` | A step, predicate, timing callback, cancellation, or deadline rejected the run. |

Errors thrown by application code are propagated unchanged, including non-Error values. Built-in control failures are instances of the exported `WorkflowError`, which extends `Error` and has a `code` from `WorkflowErrorCode`:

| Enum member | Code | Extra information |
| --- | --- | --- |
| `Cancelled` | `CANCELLED` | Cancellation was observed. |
| `TimedOut` | `TIMED_OUT` | `milliseconds` contains the step limit. |
| `Expired` | `EXPIRED` | `milliseconds` contains the workflow limit. |
| `Stopped` | `STOPPED` | A matching branch stopped the workflow. |

Control errors have a message, stack, and `name` of `WorkflowError`. Narrow unknown caught values with `instanceof WorkflowError` before checking codes; application errors remain unrestricted. Configuration validation uses `TypeError`.

A workflow can run again after completing or failing. Status belongs to the workflow instance, so use separate instances if overlapping runs need independently observable statuses.

## Defining a workflow

Use `defineWorkflow<TInput, TResult>(builder => ...)` to define a workflow with a closure. The build callback runs once when the definition is created; step factories and dynamic timings run during execution. Capture initialized dependencies and configuration in that closure. See [Workflow5](../examples/Workflow5.ts).

The subclass API remains supported. Its base constructor calls `build()` before subclass fields are initialized. Access instance configuration inside step factories or timing callbacks, rather than reading those fields directly while constructing the chain.

`run(input, source?)` requires input unless `TInput` accepts `undefined`, including `void`. For a no-input workflow with external cancellation, use `run(undefined, source)`. Nullable input (`number | null`) still requires an argument. These checks require TypeScript `strictNullChecks`; enable `strictFunctionTypes` for branch input checking as well.

Import supported types and classes from the package root. Internal constructors and implementation paths may change; see [the changelog](../CHANGELOG.md) for migration notes.
