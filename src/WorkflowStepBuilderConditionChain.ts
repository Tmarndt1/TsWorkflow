import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, IWorkflowStepBuilderBasic } from "./WorkflowStepBuilder";
import { IWorkflowStepBuilderBase, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export type OrType<Type1, Type2> = Type1 | Type2;

export interface IWorkflowStepBuilderConditionChainDo<TInput, TOutput, TResult, TContext, TConsolidated> 
    extends IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    do<TNext>(step: new () => WorkflowStep<TOutput, TNext, TContext>): IWorkflowStepBuilderConditionChain<TOutput, TNext, TResult, TContext, OrType<TConsolidated, TNext>>;
}
export interface IWorkflowStepBuilderConditionChain<TInput, TOutput, TResult, TContext, TConsolidated> 
    extends IWorkflowStepBuilderConditionChainDo<TInput, TOutput, TResult, TContext, TConsolidated>, 
        IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    if<TNext>(func: (input: TInput) => boolean): IWorkflowStepBuilderConditionChainDo<TOutput, TNext, TResult, TContext, TConsolidated>;
    unwrap(): IWorkflowStepBuilderBasic<void, TConsolidated, TResult, TContext>;
}

export class WorkflowStepBuilderConditionChain<TInput, TOutput, TResult, TContext, TConsolidated> 
    extends WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> 
        implements IWorkflowStepBuilderConditionChain<TInput, TOutput, TResult, TContext, TConsolidated> {
    
    private _condition: (input: TInput) => boolean;
    private _last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>;
    private _next: WorkflowStepBuilderConditionChain<TOutput, any, TResult, TContext, OrType<TConsolidated, any>>;

    public constructor(step: WorkflowStep<TInput, TOutput, TContext>,
        last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>, 
        context: WorkflowContext<TContext>)
    {
        super(context);
        this._last = last;
        this._context = context;
    }

    public if<TNext>(expression: (input: TInput) => boolean): IWorkflowStepBuilderConditionChainDo<TOutput, TNext, TResult, TContext, TConsolidated> {
        if (expression == null) throw new Error("Conditional function cannot be null");
        
        this._condition = expression;

        return null;
    }

    public unwrap(): IWorkflowStepBuilder<void, TConsolidated, TResult, TContext> {
        throw new Error("Method not implemented.");
    }
    
    public do<TNext>(step: new () => WorkflowStep<TOutput, TNext, TContext>): IWorkflowStepBuilderConditionChain<TOutput, TNext, TResult, TContext, OrType<TConsolidated, TNext>> {
        if (step == null) throw new Error("Step cannot be null");

        let stepBuiler = new WorkflowStepBuilderConditionChain(new step(), this, this._context);

        this._next = stepBuiler;

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
        throw new Error();
    }
}