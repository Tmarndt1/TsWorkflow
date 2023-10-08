import { IWorkflowAggregateBuilder } from "./IWorkflowAggregrateBuilder";
import { IWorkflowConditionBuilder } from "./IWorkflowConditionBuilder";
import { IWorkflowElseBuilder } from "./IWorkflowElseBuilder";

/**
 * Interface that defines the methods after if/do is established within a workflow
 */
export interface IWorkflowIfBuilder<TInput, TOutput, TResult> extends IWorkflowAggregateBuilder<TInput, TOutput, TResult> {
    /**
     * Delays the step
     * @param {number} milliseconds the time in milliseconds to delay the step
     */
    delay(func: () => number): IWorkflowIfBuilder<TInput, TOutput, TResult>;
    /**
     * Defines the amount of time the step will timeout after
     * @param {number} milliseconds the time in milliseconds the step will timeout after
     */
    timeout(func: () => number): IWorkflowIfBuilder<TInput, TOutput, TResult>;
    /**
     * Conditional method that will run a step if the expression equates to true
     * @param expression The expression to evaluate
     */
    elseIf(expression: (input: TInput) => boolean): IWorkflowConditionBuilder<TInput, TOutput, TResult>;
    /**
     * Conditional method that will run if all other if conditionals don't evaluate
     */
    else(): IWorkflowElseBuilder<TInput, TOutput, TResult>;
}