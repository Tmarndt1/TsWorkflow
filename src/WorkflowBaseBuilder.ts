import CancellationTokenSource from "./CancellationTokenSource";

export abstract class WorkflowBaseBuilder<TInput, TOutput, TResult> {
    protected _delay: () => number;
    protected _timeout: () => number;
    protected _next: WorkflowBaseBuilder<any, any, TResult>;

    protected next<T extends WorkflowBaseBuilder<TOutput, any, TResult>>(builder: T) {
        this._next = builder;

        return builder;
    }

    public getNext(): WorkflowBaseBuilder<TOutput, any, TResult> {
        return this._next;
    }

    public hasNext(): boolean {
        return this.next != null;
    }

    public abstract run(input: TInput, cts: CancellationTokenSource): Promise<TResult>;
}