import type { WorkflowRunOptions } from "./WorkflowRunOptions";
import type CancellationTokenSource from "../CancellationTokenSource";

/** Omit input only when the workflow accepts undefined (including void). */
export type WorkflowRunArgs<TInput> = undefined extends TInput
    ? [input?: TInput, options?: CancellationTokenSource | WorkflowRunOptions]
    : [input: TInput, options?: CancellationTokenSource | WorkflowRunOptions];
