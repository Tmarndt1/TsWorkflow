import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { IWorkflowNextExtBuilder, IWorkflowNextBuilder, ParallelType, WorkflowNextBuilder } from "./WorkflowNextBuilder";
import { WorkflowBaseBuilder } from "./WorkflowBaseBuilder";
import { IWorkflowFinalBuilder, WorkflowFinalBuilder } from "./WorkflowFinalBuilder";
import { IWorkflowParallelBuilder, WorkflowParallelBuilder } from "./WorkflowParallelBuilder";


export class WorkflowMoveNextBuilder<TInput, TOutput, TResult> extends WorkflowBaseBuilder<TInput, TOutput, TResult> implements IWorkflowNextBuilder<TInput, TOutput, TResult> {
    public parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(factories: T): IWorkflowParallelBuilder<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult> {
        if (!(factories instanceof Array)) throw Error("Steps must be an array");

        return this.next(new WorkflowParallelBuilder(factories));
    }

    public then<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowNextExtBuilder<TOutput, TNext, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");
        
        return this.next(new WorkflowNextBuilder(factory));
    }

    public endWith(builder: () => IWorkflowStep<TOutput, TResult>): IWorkflowFinalBuilder<TOutput, TResult> {
        if (builder == null) throw new Error("Factory cannot be null");
        
        return this.next(new WorkflowFinalBuilder(builder));
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return this._next?.run(input as any, cts) ?? Promise.reject("Internal error in workflow");
    }
}