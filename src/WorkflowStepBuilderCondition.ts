import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilderBasic } from "./WorkflowStepBuilder";
import { IWorkflowStepBuilderBase, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowStepBuilderConditionIf<TInput, TOutput, TResult, TContext> extends IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    
    if(func: (input: TInput) => boolean): IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext>;
    /**
     * Aggregates the conditionals
     */
    aggregate(): IWorkflowStepBuilderBasic<void, TOutput, TResult, TContext>;
}

export interface IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> extends IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    do<TNext>(step: new () => WorkflowStep<TOutput, TNext, TContext>): IWorkflowStepBuilderConditionIf<TInput, TOutput | TNext, TResult, TContext>;
}

export class WorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> 
    implements IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext>,
        IWorkflowStepBuilderConditionIf<TInput, TOutput, TResult, TContext> {
            
    private _condition: (input: TInput) => boolean;

    private _last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>;
    private _next: WorkflowStepBuilderBase<TOutput, any, TResult, TContext>;
    private _step: new () => WorkflowStep<TOutput, unknown, TContext>;

    public constructor(last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>, 
        context: WorkflowContext<TContext>, condition: (input: TInput) => boolean) 
    {
        super(context);
        this._last = last;
        this._context = context;
        this._condition = condition;
    }
    
    public do<TNext>(step: new () => WorkflowStep<TOutput, TNext, TContext>): IWorkflowStepBuilderConditionIf<TInput, TOutput | TNext, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");

        return null;
    }

    public aggregate(): IWorkflowStepBuilderBasic<void, TOutput, TResult, TContext> {
        throw new Error("Method not implemented.");
    }

    public if(expression: (input: TInput) => boolean): IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> {
        if (expression == null) throw new Error("Expression cannot be null");

        return null;
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