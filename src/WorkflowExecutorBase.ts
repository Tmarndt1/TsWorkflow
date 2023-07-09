import CancellationTokenSource from "./CancellationTokenSource";

export abstract class WorkflowExecutorBase<TInput, TOutput, TResult> {
    protected _delay: () => number;
    protected _timeout: () => number;
    protected _next: WorkflowExecutorBase<any, any, TResult>;

    protected next<T extends WorkflowExecutorBase<TOutput, any, TResult>>(builder: T) {
        this._next = builder;

        return builder;
    }

    public getNext(): WorkflowExecutorBase<TOutput, any, TResult> {
        return this._next;
    }

    public hasNext(): boolean {
        return this.next != null;
    }

    public abstract run(input: TInput, cts: CancellationTokenSource): Promise<TResult>;
}