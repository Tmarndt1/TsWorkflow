import { IWorkflowStep } from "../WorkflowStep";
import { IWorkflowIfBuilder } from "./IWorkflowIfBuilder";
import { IWorkflowStoppedBuilder } from "./IWorkflowStoppedBuilder";

/**
 * A pending conditional branch. TOutput tracks completed branch results,
 * excluding the original input that may pass through an unmatched block.
 */
export interface IWorkflowConditionBuilder<TInput, TOutput, TResult> {
    /**
     * If condition is true it will end the workflow
     */
    stop(): IWorkflowStoppedBuilder<TInput, TOutput, TResult>;
    /**
     * Defines the step to run if the condition is true
     * @param {new () => IWorkflowStep<TInput, TNext>} factory the step to run if the condition is true
     */
    do<TNext>(factory: () => IWorkflowStep<TInput, TNext>): IWorkflowIfBuilder<TInput, TOutput | TNext, TResult>;
}
