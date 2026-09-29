import {
    CancellationTokenSource, WorkflowError, WorkflowErrorCode, WorkflowStatus,
    type WorkflowStepStartedEvent, type WorkflowStepCompletedEvent, type WorkflowStepFailedEvent
} from "ts-workflow";
import { createCheckoutWorkflow } from "./checkout.js";
import { CheckoutError, type Order, type Receipt } from "./order.js";
import { createDemoServices } from "./services.js";

export const scenarioNames = ["success", "invalid", "declined", "cancelled", "timeout"] as const;
export type Scenario = typeof scenarioNames[number];
export type EventRecord =
    | { type: "started"; event: WorkflowStepStartedEvent }
    | { type: "completed"; event: WorkflowStepCompletedEvent }
    | { type: "failed"; event: WorkflowStepFailedEvent };

function expectedFailure(scenario: Scenario, error: unknown): boolean {
    return (scenario === "invalid" && error instanceof CheckoutError && error.code === "INVALID_ORDER") ||
        (scenario === "declined" && error instanceof CheckoutError && error.code === "PAYMENT_DECLINED") ||
        (scenario === "cancelled" && error instanceof WorkflowError && error.code === WorkflowErrorCode.Cancelled) ||
        (scenario === "timeout" && error instanceof WorkflowError && error.code === WorkflowErrorCode.TimedOut);
}

export async function runScenario(scenario: Scenario, log: (line: string) => void = console.log): Promise<{
    status: WorkflowStatus;
    events: EventRecord[];
    receipt?: Receipt;
    error?: unknown;
}> {
    const order: Order = {
        id: `demo-${scenario}`,
        items: scenario === "invalid" ? [] : [
            { sku: "keyboard", quantity: 1, unitPriceCents: 8_000 },
            { sku: "mouse", quantity: 1, unitPriceCents: 3_000 }
        ]
    };
    const source = new CancellationTokenSource();
    const workflow = createCheckoutWorkflow(createDemoServices(scenario === "declined"), scenario === "timeout" ? 5 : 1_000);
    const events: EventRecord[] = [];
    let cancelTimer: ReturnType<typeof setTimeout> | undefined;
    const tag = (event: WorkflowStepStartedEvent) => `${event.runId}/${event.stepId} ${event.kind}`;

    log(`\n=== ${scenario} ===`);
    try {
        const result = workflow.run(order, {
            cancellationTokenSource: source,
            onStarted: event => {
                events.push({ type: "started", event });
                log(`START  ${tag(event)}`);
                // Schedule cancellation only once a parallel service is active.
                if (scenario === "cancelled" && event.kind === "parallel" && cancelTimer === undefined) {
                    cancelTimer = setTimeout(() => { source.cancel(); log("CANCEL requested"); }, 10);
                }
            },
            onCompleted: event => {
                events.push({ type: "completed", event });
                log(`DONE   ${tag(event)} (${event.durationMs.toFixed(1)} ms)`);
            },
            onFailed: event => {
                events.push({ type: "failed", event });
                const reason = event.error instanceof Error ? event.error.message : String(event.error);
                log(`FAILED ${tag(event)} [${event.origin}] ${reason}`);
            }
        });
        const receipt = await result;
        if (scenario !== "success") throw new Error(`Expected the ${scenario} scenario to reject.`);
        log(`Receipt: ${JSON.stringify(receipt, null, 2)}`);
        log(`Status: ${WorkflowStatus[workflow.status]}`);
        return { status: workflow.status, events, receipt };
    } catch (error) {
        if (!expectedFailure(scenario, error)) throw error;
        log(`Handled expected error; status: ${WorkflowStatus[workflow.status]}`);
        return { status: workflow.status, events, error };
    } finally {
        clearTimeout(cancelTimer);
    }
}
