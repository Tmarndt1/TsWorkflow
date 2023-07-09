import CancellationTokenSource from "../CancellationTokenSource";
import { IWorkflowStep, WorkflowStep } from "../WorkflowStep";
import { IWorkflowExecutorExt, IWorkflowExecutor, ParallelType, WorkflowExecutor } from "./WorkflowExecutor";
import { WorkflowExecutorBase } from "./WorkflowExecutorBase";
import { IWorkflowExecutorCondition, WorkflowExecutorCondition } from "./WorkflowExecutorCondition";
import { IWorkflowExecutorEnd, WorkflowExecutorEnd } from "./WorkflowExecutorEnd";
import { IWorkflowExecutorParallel, WorkflowExecutorParallel } from "./WorkflowExecutorParallel";


export class WorkflowExecutorMoveNext<TInput, TOutput, TResult> extends WorkflowExecutorBase<TInput, TOutput, TResult> implements IWorkflowExecutor<TInput, TOutput, TResult> {
    public parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(factories: T): IWorkflowExecutorParallel<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult> {
        if (!(factories instanceof Array)) throw Error("Steps must be an array");

        return this.next(new WorkflowExecutorParallel(factories));
    }

    public if(expression: (output: TOutput) => boolean): IWorkflowExecutorCondition<TOutput, TOutput, TResult> {
        if (expression == null) throw new Error("Expression function cannot be null");
        
        return this.next(new WorkflowExecutorCondition<TOutput, TOutput, TResult>(expression));
    }

    public then<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowExecutorExt<TOutput, TNext, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");
        
        return this.next(new WorkflowExecutor(factory));
    }

    public endWith(builder: () => IWorkflowStep<TOutput, TResult>): IWorkflowExecutorEnd<TOutput, TResult> {
        if (builder == null) throw new Error("Factory cannot be null");
        
        return this.next(new WorkflowExecutorEnd(builder));
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return this._next?.run(input as any, cts) ?? Promise.reject("Internal error in workflow");
    }
}