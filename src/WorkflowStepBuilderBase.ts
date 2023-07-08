import CancellationTokenSource from "./CancellationTokenSource";
import { ErrorHandler } from "./ErrorHandler";

export abstract class WorkflowStepBuilderBase<TInput, TOutput, TResult> {
    protected _delayTime: number = 0;
    protected _retryIn: number = 0;
    protected _errorHandler: ErrorHandler | null = null;
    protected _timeout: number | null = null;
    protected _cancellationTokenSource: CancellationTokenSource | null = null;

    protected _next: WorkflowStepBuilderBase<any, any, TResult>;

    protected next<T extends WorkflowStepBuilderBase<TOutput, any, TResult>>(builder: T) {
        this._next = builder;

        return builder;
    }

    public getNext(): WorkflowStepBuilderBase<any, any, TResult> {
        return this._next;
    }

    public getTimeout(): number | null {
        return this._timeout;
    }

    public hasNext(): boolean {
        return this.next != null;
    }

    public abstract run(input: TInput, cts: CancellationTokenSource): Promise<TOutput>;
}