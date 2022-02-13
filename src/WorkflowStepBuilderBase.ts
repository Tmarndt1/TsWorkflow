import CancellationTokenSource, { CancellationToken } from "./CancellationTokenSource";
import { ErrorHandler } from "./ErrorHandler";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";

export interface IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {

}

export abstract class WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> implements IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    protected _context: WorkflowContext<TContext> = null;
    protected _delayTime: number = 0;
    protected _retryMilliseconds: number = 0;
    protected _errorHandler: ErrorHandler = null;
    protected _timeout: number | null = null;
    protected _cancellationTokenSource: CancellationTokenSource = null;
    protected _errorStep: WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext>;

    public constructor(context: WorkflowContext<TContext>) 
    {
        this._context = context;
    }

    public abstract getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext>;

    public abstract getTimeout(): number | null;

    public abstract hasNext(): boolean;

    public abstract run(input: TInput, cts: CancellationTokenSource): Promise<TOutput>;
}