import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, IWorkflowStepBuilderBasic, ParallelType, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderCondition, WorkflowStepBuilderCondition } from "./WorkflowStepBuilderCondition";
import { IWorkflowStepBuilderEnd, WorkflowStepBuilderFinal } from "./WorkflowStepBuilderEnd";
import { IWorkflowStepBuilderParallel, WorkflowStepBuilderParallel } from "./WorkflowStepBuilderParallel";


export class WorkflowStepBuilderAggregate<TInput, TOutput, TResult> extends WorkflowStepBuilderBase<TInput, TOutput, TResult> implements IWorkflowStepBuilderBasic<TInput, TOutput, TResult> {

    public constructor(last: WorkflowStepBuilderBase<any, any, TResult>) {
        super();
    }

    public parallel<T extends (() => WorkflowStep<any, any>)[] | []>(factories: T): IWorkflowStepBuilderParallel<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult> {
        if (!(factories instanceof Array)) throw Error("Steps must be an array");

        return this.next(new WorkflowStepBuilderParallel(factories));
    }

    public if(expression: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TOutput, TResult> {
        if (expression == null) throw new Error("Expression function cannot be null");
        
        return this.next(new WorkflowStepBuilderCondition<TOutput, TOutput, TResult>(this, expression));
    }

    public then<TNext>(factory: () => WorkflowStep<TOutput, TNext>): IWorkflowStepBuilder<TOutput, TNext, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");
        
        return this.next(new WorkflowStepBuilder(factory));
    }

    public endWith(builder: () => WorkflowStep<TOutput, TResult>): IWorkflowStepBuilderEnd<TOutput, TResult> {
        if (builder == null) throw new Error("Factory cannot be null");
        
        return this.next(new WorkflowStepBuilderFinal(builder));

    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TOutput> {
        return this._next?.run(input as any, cts) ?? Promise.reject("Internal error in workflow");
    }
}