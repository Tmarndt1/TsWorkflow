import type CancellationTokenSource from "../CancellationTokenSource";
import type { Awaitable } from "./Awaitable";

export type WorkflowStepKind = "sequential" | "parallel" | "conditional" | "final";

/** Metadata only: input and output values are not included. IDs are opaque and local to this library instance. */
export interface WorkflowStepStartedEvent {
    readonly runId: string;
    readonly stepId: string;
    readonly kind: WorkflowStepKind;
    /** Unix timestamp in milliseconds. */
    readonly timestamp: number;
}

export interface WorkflowStepCompletedEvent extends WorkflowStepStartedEvent {
    /** Elapsed step execution time, excluding its configured delay. */
    readonly durationMs: number;
}

export interface WorkflowStepFailedEvent extends WorkflowStepCompletedEvent {
    readonly error: unknown;
    /** Whether the step failed itself, or the run ended while this step was active. */
    readonly origin: "step" | "run";
}

/** Per-run observers. Thrown errors and rejected observer promises are ignored; observers are not awaited. */
export interface WorkflowRunOptions {
    readonly cancellationTokenSource?: CancellationTokenSource;
    readonly onStarted?: (event: WorkflowStepStartedEvent) => Awaitable<void>;
    readonly onCompleted?: (event: WorkflowStepCompletedEvent) => Awaitable<void>;
    readonly onFailed?: (event: WorkflowStepFailedEvent) => Awaitable<void>;
}
