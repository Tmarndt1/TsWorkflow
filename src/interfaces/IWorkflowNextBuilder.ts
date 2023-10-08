import { ParallelType } from "../WorkflowNextBuilder";
import { IWorkflowStep } from "../WorkflowStep";
import { IWorkflowFinalBuilder } from "./IWorkflowFinalBuilder";
import { IWorkflowNextExtBuilder } from "./IWorkflowNextExtBuilder";
import { IWorkflowParallelBuilder } from "./IWorkflowParallelBuilder";

export interface IWorkflowNextBuilder<TInput, TOutput, TResult> {
    then<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowNextExtBuilder<TOutput, TNext, TResult>;
    endWith(factory: () => IWorkflowStep<TOutput, TResult>): IWorkflowFinalBuilder<TOutput, TResult>;
    parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(steps: T): IWorkflowParallelBuilder<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult>;
}