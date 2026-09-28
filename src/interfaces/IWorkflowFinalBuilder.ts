import { Timing } from "../types/Timing";
export interface IWorkflowFinalBuilder<TInput, TResult> {
    /**
     * Timeout for the entire workflow. If the timeout expires the workflow will be cancelled.
     * @param duration A finite millisecond value or a callback evaluated during execution.
     */
    expire(duration: Timing): IWorkflowFinalBuilder<TInput, TResult>;

    delay(duration: Timing): IWorkflowFinalBuilder<TInput, TResult>;
}
