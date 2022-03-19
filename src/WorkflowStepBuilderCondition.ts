import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilderBase, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderConditionChain, OrType, WorkflowStepBuilderConditionChain } from "./WorkflowStepBuilderConditionChain";

export interface IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> extends IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    do<TNext>(step: new () => WorkflowStep<TOutput, TNext, TContext>): IWorkflowStepBuilderConditionChain<TOutput, TNext, TResult, TContext, OrType<TNext, TNext>>;
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

    public do<TNext>(step: new () => WorkflowStep<TOutput, TNext, TContext>): IWorkflowStepBuilderConditionChain<TOutput, TNext, TResult, TContext, OrType<TNext, TNext>> {
        if (step == null) throw new Error("Step cannot be null");

        let stepBuiler = new WorkflowStepBuilderConditionChain<TOutput, TNext, TResult, TContext, OrType<TNext, TNext>>(new step(), this, this._context);

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