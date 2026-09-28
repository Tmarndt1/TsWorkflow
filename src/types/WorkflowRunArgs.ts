import type CancellationTokenSource from "../CancellationTokenSource";

/** Omit input only when the workflow accepts undefined (including void). */
export type WorkflowRunArgs<TInput> = undefined extends TInput
    ? [input?: TInput, cts?: CancellationTokenSource]
    : [input: TInput, cts?: CancellationTokenSource];
