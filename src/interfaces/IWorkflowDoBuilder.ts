import { IWorkflowAggregateBuilder } from "./IWorkflowAggregrateBuilder";

/**
 * Interface that defines the methods after if/do is established within a workflow
 */
export interface IWorkflowDoBuilder<TInput, TOutput, TResult> extends IWorkflowAggregateBuilder<TInput, TOutput, TResult> {
    /**
     * Delays the step
     * @param {number} milliseconds the time in milliseconds to delay the step
     */
    delay(func: () => number): IWorkflowDoBuilder<TInput, TOutput, TResult>;
    /**
     * Defines the amount of time the step will timeout after
     * @param {number} milliseconds the time in milliseconds the step will timeout after
     */
    timeout(func: () => number): IWorkflowDoBuilder<TInput, TOutput, TResult>;
}