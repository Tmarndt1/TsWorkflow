import { Timing } from "../types/Timing";
import { IWorkflowAggregateBuilder } from "./IWorkflowAggregrateBuilder";

/**
 * Interface that defines the methods after if/do is established within a workflow
 */
export interface IWorkflowDoBuilder<TInput, TOutput, TResult> extends IWorkflowAggregateBuilder<TInput, TOutput, TResult> {
    /**
     * Delays the step
     * @param duration A finite millisecond value or a callback evaluated during execution.
     */
    delay(duration: Timing): IWorkflowDoBuilder<TInput, TOutput, TResult>;
    /**
     * Defines the amount of time the step will timeout after
     * @param duration A finite millisecond value or a callback evaluated during execution.
     */
    timeout(duration: Timing): IWorkflowDoBuilder<TInput, TOutput, TResult>;
}