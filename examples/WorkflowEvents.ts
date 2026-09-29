import {
    CancellationTokenSource,
    defineWorkflow,
    WorkflowError,
    WorkflowErrorCode
} from "../index";

// In an installed application, import these APIs from "ts-workflow".
type Log = (message: string, detail?: unknown) => void;

/** Observe each executed step, including individual parallel steps. */
export async function runCompletedEventsExample(log: Log = console.log): Promise<string> {
    const workflow = defineWorkflow<string, string>(builder => builder
        .startWith(() => ({ run: name => name.trim() }))
        .if(name => name.length > 0)
            .do(() => ({ run: name => name.toUpperCase() }))
        .endIf()
        .parallel([
            () => ({ run: name => `Hello, ${name}` }),
            () => ({ run: async name => name.length })
        ])
        .endWith(() => ({ run: ([greeting, length]) => `${greeting}! (${length} letters)` })));

    const result = await workflow.run("  Ada  ", {
        onStarted: event => {
            // Correlate callbacks with event.runId and event.stepId.
            log("Started", event);
        },
        onCompleted: event => {
            // durationMs measures this step's execution, excluding its configured delay.
            log("Completed", event);
        },
        onFailed: event => {
            log("Failed", event);
        }
    });

    log("Result", result);
    return result;
}

/** onFailed observes the error; callers must still handle the rejected run. */
export async function runFailedEventsExample(log: Log = console.log): Promise<void> {
    const validationError = new Error("Amount must be non-negative");
    const workflow = defineWorkflow<number, string>(builder => builder
        .startWith(() => ({ run: amount => amount }))
        .then(() => ({ run: amount => {
            if (amount < 0) throw validationError;
            return amount;
        } }))
        .endWith(() => ({ run: amount => amount.toFixed(2) })));

    try {
        await workflow.run(-1, {
            onStarted: event => {
                log("Started", event);
            },
            onCompleted: event => {
                log("Completed", event);
            },
            onFailed: event => {
                // origin is "step" here because the step threw this error.
                log("Failed", event);
            }
        });
    } catch (error) {
        if (error !== validationError) throw error;
        log("Handled application error", error.message);
    }
}

/** Combine per-run observers with cooperative cancellation of an active step. */
export async function runCancelledEventsExample(log: Log = console.log): Promise<void> {
    const source = new CancellationTokenSource();
    const workflow = defineWorkflow<void, string>(builder => builder
        .startWith(() => ({ run: async (_input, token) => {
            // Simulate in-flight work, then observe cancellation before continuing.
            await new Promise<void>(resolve => setTimeout(resolve, 25));
            token?.throwIfCancelled();
            return "Work finished";
        } }))
        .endWith(() => ({ run: result => result })));

    const result = workflow.run(undefined, {
        cancellationTokenSource: source,
        onStarted: event => {
            log("Started", event);
        },
        onCompleted: event => {
            log("Completed", event);
        },
        onFailed: event => {
            log("Failed", event);
        }
    });

    source.cancel();
    log("Cancellation requested");

    try {
        await result;
    } catch (error) {
        if (!(error instanceof WorkflowError) || error.code !== WorkflowErrorCode.Cancelled) throw error;
        log("Handled cancellation", error.code);
    }
}

async function main(): Promise<void> {
    console.log("\n--- Successful steps and parallel events ---");
    await runCompletedEventsExample();
    console.log("\n--- Application failure ---");
    await runFailedEventsExample();
    console.log("\n--- Cooperative cancellation ---");
    await runCancelledEventsExample();
}

if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}
