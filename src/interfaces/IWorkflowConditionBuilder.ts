import { IWorkflowStep } from "../WorkflowStep";
import { IWorkflowIfBuilder } from "./IWorkflowIfBuilder";
import { IWorkflowStoppedBuilder } from "./IWorkflowStoppedBuilder";

/**
 * Interface that defines the basic methods on a conditional workflow
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
    do<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowIfBuilder<TInput, TOutput | TNext, TResult>;
}