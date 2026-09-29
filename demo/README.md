# Order-processing demo

A TypeScript demo with an interactive static webpage and a CLI, both consuming the local `ts-workflow` package. All inventory and payment operations are simulated; no credentials or real charges are involved.

## Interactive webpage

After installing dependencies in the repository root and in `demo/`, run from `demo/`:

```sh
npm run web
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). Choose a scenario, change the order subtotal or service duration, and click **Run workflow**. Watch step states and lifecycle events update, or click **Cancel** during execution. Try a subtotal below $100 to skip the discount branch.

The page executes the real library entirely in the browser. The local server only serves files. No framework, CDN, or backend API is needed. Use a current browser with JavaScript modules and import-map support.

To create deployable static files:

```sh
npm run build:web
```

Serve or upload the contents of `demo/site/` to any static web host. The build includes the library and uses relative asset paths, so hosting under a subdirectory works. Open it over HTTP rather than directly through `file://`. Generated files are ignored by Git. Stop the local server with Ctrl+C; rebuild and refresh after editing source files.

Browser UI: [src/browser.ts](src/browser.ts), [web/index.html](web/index.html), and [web/style.css](web/style.css). The browser and CLI share the same checkout definition and simulated services.

## CLI setup

The webpage includes code excerpts and actual returned values for every step. Active steps highlight their code; parallel service calls remain highlighted while awaiting results. Completed steps retain a return-line highlight, while failures show errors and their origin. These are lifecycle-based highlights, not a JavaScript debugger: synchronous statements may finish immediately. A demo-only output callback captures results without adding payloads to the library's public lifecycle events.

Use Node.js 24. From the repository root:

```sh
npm ci
npm run build
cd demo
npm install
npm start
```

The demo depends on `"ts-workflow": "file:.."` and imports its public API from `ts-workflow`, including the built TypeScript declarations. Build the parent library first. After changing the library, run its build again before running the demo. Once the demo dependencies are installed, `npm ci` can reproduce them from its lockfile.

## Scenarios

`npm start` builds the demo and runs all five scenarios. Select one with:

```sh
npm start -- success
npm start -- invalid
npm start -- declined
npm start -- cancelled
npm start -- timeout
```

| Scenario | What happens |
| --- | --- |
| `success` | Validates a $110 order, applies a 10% discount, runs inventory and payment in parallel, and returns a $99 receipt. |
| `invalid` | Rejects an empty order before any service runs. |
| `declined` | Simulates a rejected payment and reports the application error. |
| `cancelled` | Cancels active parallel services using the run's cancellation source. |
| `timeout` | Exceeds the parallel group's time limit and reports active steps as failed. |

Expected errors are handled and printed; unexpected errors exit with a nonzero status. `npm start -- --help` lists the available scenarios.

## Workflow and events

The workflow follows `validate → optional discount → parallel services → receipt`. Each run configures `onStarted`, `onCompleted`, and `onFailed`. Logs include the run ID, step ID, step kind, and duration or error. IDs and durations vary between runs.

Completed events refer to individual steps. Parallel services emit separate events; skipped discount branches emit none. Failure observers do not consume the rejected run, so the scenario runner handles the error separately. On failure, `origin: "run"` marks an active step whose run ended, rather than an error thrown by that step itself.

Cancellation is cooperative: simulated services check the token after their asynchronous work resumes. Timeouts and cancellation do not undo work already performed. A production checkout would need appropriate service cancellation and compensation for side effects.

## Project layout

| File | Responsibility |
| --- | --- |
| [src/checkout.ts](src/checkout.ts) | Typed workflow definition, validation, discount, parallel steps, and receipt. |
| [src/services.ts](src/services.ts) | Simulated services and cancellation checks. |
| [src/scenarios.ts](src/scenarios.ts) | Per-run event hooks and expected error handling. |
| [src/main.ts](src/main.ts) | CLI scenario selection. |
| [test/scenarios.cjs](test/scenarios.cjs) | End-to-end scenarios, event assertions, validation, concurrency, and CLI checks. |

## Checks

```sh
npm test
```

This compiles the demo under strict TypeScript settings and runs its own tests using Node's built-in test runner. The parent repository's `npm test` does not run these tests.
