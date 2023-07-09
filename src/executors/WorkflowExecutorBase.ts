import CancellationTokenSource from "../CancellationTokenSource";

export abstract class WorkflowExecutorBase<TInput, TOutput, TResult> {
    protected _delay: number = 0;
    protected _retry: number = 0;
    protected _timeout: number | null = null;
    protected _cts: CancellationTokenSource | null = null;

    protected _next: WorkflowExecutorBase<any, any, TResult>;

    protected next<T extends WorkflowExecutorBase<TOutput, any, TResult>>(builder: T) {
        this._next = builder;

        return builder;
    }

    public getNext(): WorkflowExecutorBase<any, any, TResult> {
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