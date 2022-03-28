import CancellationTokenSource from "./CancellationTokenSource";

export interface IWorkflowContext<TContext> {
    data: TContext | null;
    cancellationTokenSource: CancellationTokenSource | null;
}

export class WorkflowContext<TContext> implements IWorkflowContext<TContext> {
    public data: TContext | null;

    public cancellationTokenSource: CancellationTokenSource | null = null;

    public constructor(data: TContext, cts: CancellationTokenSource) {
        this.data = data;
        this.cancellationTokenSource = cts;
    }
}