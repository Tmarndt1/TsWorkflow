import { IWorkflowNextBuilder } from "./IWorkflowNextBuilder";

/**
 * Interface that defines the aggregate method
 */
export interface IWorkflowAggregateBuilder<TInput, TOutput, TResult> {
    /**
     * Aggregates the conditional branches
     */
    endIf(): IWorkflowNextBuilder<void, TOutput, TResult>;
}
