import CancellationTokenSource from "./CancellationTokenSource";
import { ErrorHandler } from "./ErrorHandler";
import { WorkflowContext } from "./WorkflowContext";

export abstract class WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    protected _context: WorkflowContext<TContext> | null = null;
    protected _delayTime: number = 0;
    protected _retryMilliseconds: number = 0;
    protected _errorHandler: ErrorHandler | null = null;
    protected _timeout: number | null = null;
    protected _cancellationTokenSource: CancellationTokenSource | null = null;
    protected _errorStep: WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> | null = null;

    public constructor(context: WorkflowContext<TContext> | null) 
    {
        this._context = context;
    }

    public abstract getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext> | null;

    public abstract getTimeout(): number | null;

    public abstract hasNext(): boolean;

    public abstract run(input: TInput, cts: CancellationTokenSource): Promise<TOutput>;
}