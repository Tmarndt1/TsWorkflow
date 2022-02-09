import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowErrorHandler } from "./WorkflowErrorHandler";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { IWorkflowStepBuilderBase, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> extends IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    do<TNextOutput>(step: new () => WorkflowStep<TOutput, TNextOutput, TContext>): IWorkflowStepBuilder<TOutput, TNextOutput, TResult, TContext>;
}

export class WorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> implements IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> {
    private _conditionalFunc: (input: TInput) => boolean;

    public constructor(last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>, context: WorkflowContext<TContext>, func: (input: TInput) => boolean) {
        super(null, last, context);
        this._lastStep = last;
        this._context = context;
        this._conditionalFunc = func;
    } 

    public do<TNextOutput>(step: new () => WorkflowStep<TOutput, TNextOutput, TContext>): IWorkflowStepBuilder<TOutput, TNextOutput, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");

        let stepBuiler = new WorkflowStepBuilder(new step(), this, this._context);

        this._nextStep = stepBuiler;

        return stepBuiler;
    }

    public hasNext(): boolean {
        return this._nextStep != null;
    }

    public getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext> {
        return this._nextStep;
    }

    public getTimeout(): number | null {
        return this._timeout;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TOutput> {
        if (!this._conditionalFunc(input)) {
            return Promise.resolve(input as any);
        } else {
            return this._nextStep.run(input as any, cts);
        }
    }
}