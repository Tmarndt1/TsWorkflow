import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { IWorkflowStepBuilderBase, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> extends IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    do<TNextOutput>(step: new () => WorkflowStep<TOutput, TNextOutput, TContext>): IWorkflowStepBuilder<TOutput, TNextOutput, TResult, TContext>;
}

export class WorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> implements IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> {
    private _condition: (input: TInput) => boolean;
    private _last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>;
    private _next: WorkflowStepBuilderBase<TOutput, any, TResult, TContext>;

    public constructor(last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>, 
        context: WorkflowContext<TContext>, condition: (input: TInput) => boolean) 
    {
        super(context);
        this._last = last;
        this._context = context;
        this._condition = condition;
    } 

    public do<TNextOutput>(step: new () => WorkflowStep<TOutput, TNextOutput, TContext>): IWorkflowStepBuilder<TOutput, TNextOutput, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");

        let stepBuiler = new WorkflowStepBuilder(new step(), this, this._context);

        this._next = stepBuiler;

        return stepBuiler;
    }

    public hasNext(): boolean {
        return this._next != null;
    }

    public getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext> {
        return this._next;
    }

    public getTimeout(): number | null {
        return this._timeout;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TOutput> {
        if (!this._condition(input)) {
            return Promise.resolve(input as any);
        } else {
            return this._next.run(input as any, cts);
        }
    }
}