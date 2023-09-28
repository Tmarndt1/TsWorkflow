import CancellationTokenSource from "./CancellationTokenSource";
import { Workflow } from "./Workflow";

export abstract class WorkflowStepBuilder<TInput, TOutput, TResult> {
    protected _delay: () => number;
    protected _timeout: () => number;
    protected _next: WorkflowStepBuilder<any, any, TResult>;
    protected readonly _workflow: Workflow<any, TResult>;
    constructor(workflow: Workflow<any, TResult>) {
        this._workflow = workflow;
    }

    protected next<T extends WorkflowStepBuilder<TOutput, any, TResult>>(builder: T) {
        this._next = builder;

        return builder;
    }

    public getNext(): WorkflowStepBuilder<TOutput, any, TResult> {
        return this._next;
    }

    public hasNext(): boolean {
        return this.next != null;
    }

    public abstract run(input: TInput, cts: CancellationTokenSource): Promise<TResult>;
}