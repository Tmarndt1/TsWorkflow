import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { WorkflowNextBuilder } from "./WorkflowNextBuilder";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowFinalBuilder } from "./WorkflowFinalBuilder";
import { WorkflowParallelBuilder } from "./WorkflowParallelBuilder";
import { IWorkflowFinalBuilder } from "./interfaces/IWorkflowFinalBuilder";
import { IWorkflowNextBuilder } from "./interfaces/IWorkflowNextBuilder";
import { IWorkflowNextExtBuilder } from "./interfaces/IWorkflowNextExtBuilder";
import { IWorkflowParallelBuilder } from "./interfaces/IWorkflowParallelBuilder";
import { ParallelType } from "./types/ParallelType";
import { verifyNullOrThrow } from "./functions/verifyNullOrThrow";

export class WorkflowMoveNextBuilder<TInput, TOutput, TResult> extends WorkflowStepBuilder<TInput, TOutput, TResult> implements IWorkflowNextBuilder<TInput, TOutput, TResult> {
    public parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(funcs: T): IWorkflowParallelBuilder<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult> {
        if (!(funcs instanceof Array)) throw Error("Parameter must be of type Array");
        
        return this.next(new WorkflowParallelBuilder(funcs, this._workflow));
    }

    public then<TNext>(func: () => IWorkflowStep<TOutput, TNext>): IWorkflowNextExtBuilder<TOutput, TNext, TResult> {
        verifyNullOrThrow(func);
        
        return this.next(new WorkflowNextBuilder(func, this._workflow));
    }

    public endWith(func: () => IWorkflowStep<TOutput, TResult>): IWorkflowFinalBuilder<TOutput, TResult> {
        verifyNullOrThrow(func);
        
        return this.next(new WorkflowFinalBuilder(func, this._workflow));
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return this._next?.run(input as any, cts) ?? Promise.reject("Internal error in workflow");
    }
}