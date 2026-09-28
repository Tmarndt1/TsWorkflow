# TsWorkflow

**Typed workflows, written as a fluent chain.**

Compose asynchronous steps, choose conditional branches, and run work in parallel. A small TypeScript and JavaScript library with no runtime dependencies, distributed as CommonJS, ESM, and TypeScript declarations.

[![CI](https://github.com/Tmarndt1/TsWorkflow/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/Tmarndt1/TsWorkflow/actions/workflows/main.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Coverage gate: 100%](https://img.shields.io/badge/coverage%20gate-100%25-15803d)](jest.config.js)

[Quick start](#quick-start) · [API](#api-at-a-glance) · [Execution guide](docs/execution.md) · [Examples](examples) · [Contributing](CONTRIBUTING.md)

## Why TsWorkflow?

- **Typed step boundaries.** Each step receives the previous output; parallel results retain their tuple types.
- **Readable branching.** Express conditions with `if`, `elseIf`, `else`, and `stop`.
- **Parallel work.** Run independent steps together and receive results in declaration order.
- **Execution controls.** Configure delays, step timeouts, and a deadline for the whole workflow.
- **Reusable definitions.** Create steps from factories for each run, using plain objects or `WorkflowStep` subclasses.

## Installation

```sh
npm install ts-workflow
```

Use Node.js 24 for repository development. The source targets ES2022; use a runtime that supports that output. These examples describe the current repository; changes in [Unreleased](CHANGELOG.md#unreleased) may not yet be available in the published package.

## Quick start

```typescript
import { defineWorkflow } from "ts-workflow";

const greeting = defineWorkflow<string, string>(builder => builder
    .startWith(() => ({ run: name => name.trim() }))
    .if(name => name.length === 0)
        .stop()
    .endIf()
    .parallel([
        () => ({ run: name => `Hello, ${name}` }),
        () => ({ run: name => name.length })
    ])
    .endWith(() => ({
        run: ([message, length]) => `${message}! (${length} letters)`
    }))
    .expire(5_000));

async function main() {
    console.log(await greeting.run("  Ada  ")); // Hello, Ada! (3 letters)
}

main().catch(console.error);
```

A step is an object with a `run(input, token?)` method that returns a value, promise, or thenable. Use a factory such as `() => new MyStep()` when a step has its own state or dependencies. The existing `Workflow` and `WorkflowStep` subclass APIs are also supported. See [the examples](examples), including a [function-based workflow](examples/Workflow5.ts) that captures configuration.

## API at a glance

| Method | Purpose |
| --- | --- |
| `defineWorkflow<Input, Output>(build)` | Define a reusable workflow without a subclass. |
| `startWith(factory)` | Define the first step. |
| `then(factory)` | Pass the previous output into another step. |
| `parallel(factories)` | Give each step the same input; collect ordered results. |
| `if(predicate).do(factory)` | Run a step when its predicate matches. |
| `elseIf(predicate)` / `else()` | Add alternative branches. |
| `stop()` | Reject the run with stopped status when a branch matches. |
| `endIf()` | Continue after the conditional block. |
| `delay(ms)` / `delay(() => ms)` | Wait before the configured step or branch. |
| `timeout(ms)` / `timeout(() => ms)` | Limit a step's delay and execution. |
| `endWith(factory)` | Define the final step and workflow result. |
| `expire(ms)` / `expire(() => ms)` | Limit the whole workflow; configure after `endWith`. |
| `run(input, sourceOrOptions?)` | Execute with cancellation and/or step event hooks. |

The fluent interfaces expose methods only where they are valid. Input can be omitted for `void` or undefined-accepting workflows. Enable TypeScript's `strictNullChecks` and `strictFunctionTypes` (or `strict`) to enforce input and branch safety. Read the [execution guide](docs/execution.md) for timing, cancellation, structured errors, and status transitions. Existing users should review the [migration notes](docs/migration.md).

### Step events

Pass `onStarted`, `onCompleted`, and `onFailed` in the second argument to `run()` to observe individual steps:

```typescript
const result = await greeting.run("Ada", {
    onStarted: event => {
        console.log(`Started ${event.stepId} (${event.kind})`);
    },
    onCompleted: event => {
        console.log(`Completed ${event.stepId} in ${event.durationMs}ms`);
    },
    onFailed: event => {
        console.error(`Failed ${event.stepId}`, event.error);
    }
});
```

Events contain an opaque `runId`, `stepId`, `kind`, and timestamps. Completion events also include `durationMs`; failure events include `error` and `origin`. Parallel steps each emit their own events, and their IDs let you correlate events from overlapping runs. Hooks never receive step input or output, are not awaited, and errors thrown by a hook are ignored so observers cannot change the workflow result. See the [eventing section](docs/execution.md#step-events) for lifecycle details.

## Development

```sh
npm ci
npm run check
```

`check` type-checks the source, examples, and API type tests; runs tests with coverage; builds the package; and checks both module formats. CI is configured to run these checks on Ubuntu and Windows with Node.js 24.

Every source file is included in the 100% statement, branch, function, and line coverage gate. This is a coverage requirement, not a guarantee that every possible behavior is tested. See [CONTRIBUTING.md](CONTRIBUTING.md) for individual commands and pull request guidance.

## Feedback and contributions

[Report a bug](https://github.com/Tmarndt1/TsWorkflow/issues/new?template=bug_report.yml) or [suggest an improvement](https://github.com/Tmarndt1/TsWorkflow/issues/new?template=feature_request.yml). Include a small workflow that demonstrates the behavior when possible.

## License

[MIT](LICENSE) · Created by Travis Arndt.
