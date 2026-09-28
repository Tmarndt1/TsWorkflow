import { Timing } from "../types/Timing";
import { IWorkflowConditionBuilder } from "./IWorkflowConditionBuilder";
import { IWorkflowNextBuilder } from "./IWorkflowNextBuilder";

export interface IWorkflowNextExtBuilder<TInput, TOutput, TResult> extends IWorkflowNextBuilder<TInput, TOutput, TResult> {
    if(func: (output: TOutput) => boolean): IWorkflowConditionBuilder<TOutput, never, TResult>;
    delay(duration: Timing): IWorkflowNextExtBuilder<TInput, TOutput, TResult>;
    timeout(duration: Timing): IWorkflowNextExtBuilder<TInput, TOutput, TResult>;
}