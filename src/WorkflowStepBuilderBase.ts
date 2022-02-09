import CancellationTokenSource, { CancellationToken } from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowErrorHandler } from "./WorkflowErrorHandler";
import { WorkflowStep } from "./WorkflowStep";

export interface IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {

}

export abstract class WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> implements IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    protected _lastStep: WorkflowStepBuilderBase<any, TInput, TResult, TContext> = null;
    protected _nextStep: WorkflowStepBuilderBase<TOutput, any, TResult, TContext> = null;
    protected _currentStep: WorkflowStep<TInput, TOutput, TContext> = null;
    protected _context: WorkflowContext<TContext> = null;
    protected _delayTime: number = 0;
    protected _retryMilliseconds: number = 0;
    protected _workflowErrorHandler: WorkflowErrorHandler = null;
    protected _timeout: number | null = null;

    public constructor(step: WorkflowStep<TInput, TOutput, TContext>, last: WorkflowStepBuilderBase<any, any, TResult, TContext>, context: WorkflowContext<TContext>) {
        this._currentStep = step;
        this._lastStep = last; 
        this._context = context;
    }

    public abstract getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext>;

    public abstract getTimeout(): number | null;

    public abstract hasNext(): boolean;

    public abstract run(input: TInput, cts: CancellationTokenSource): Promise<TOutput>;
}