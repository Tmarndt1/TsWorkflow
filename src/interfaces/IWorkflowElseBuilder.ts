import { IWorkflowStep } from "../WorkflowStep";
import { IWorkflowAggregateBuilder } from "./IWorkflowAggregrateBuilder";
import { IWorkflowDoBuilder } from "./IWorkflowDoBuilder";

/** An exhaustive fallback; later steps receive branch outputs without pass-through input. */
export interface IWorkflowElseBuilder<TInput, TOutput, TResult> {
    /**
     * Defines the step to run
     * @param {new () => IWorkflowStep<TInput, TNext>} factory the step to run
     */
    do<TNext>(factory: () => IWorkflowStep<TInput, TNext>): IWorkflowDoBuilder<TInput, TOutput | TNext, TResult>;
        /**
     * If condition is true it will end the workflow
     */
    stop(): IWorkflowAggregateBuilder<TInput, TOutput, TResult>;
}
