import { IWorkflowConditionBuilder } from "./IWorkflowConditionBuilder";
import { IWorkflowElseBuilder } from "./IWorkflowElseBuilder";
import { IWorkflowNextBuilder } from "./IWorkflowNextBuilder";

export interface IWorkflowStoppedBuilder<TInput, TOutput, TResult> {
    /**
     * Aggregates the conditional results
     */
    endIf(): IWorkflowNextBuilder<void, TOutput, TResult>;
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
