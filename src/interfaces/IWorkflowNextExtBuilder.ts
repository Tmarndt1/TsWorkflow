import { IWorkflowConditionBuilder } from "./IWorkflowConditionBuilder";
import { IWorkflowNextBuilder } from "./IWorkflowNextBuilder";

export interface IWorkflowNextExtBuilder<TInput, TOutput, TResult> extends IWorkflowNextBuilder<TInput, TOutput, TResult> {
    if(func: (output: TOutput) => boolean): IWorkflowConditionBuilder<TOutput, TOutput, TResult>;
    delay(func: () => number): IWorkflowNextExtBuilder<TInput, TOutput, TResult>;
    timeout(func: () => number): IWorkflowNextExtBuilder<TInput, TOutput, TResult>;
}