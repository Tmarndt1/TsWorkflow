import CancellationTokenSource from "./CancellationTokenSource";

export interface IWorkflowContext<TContext> {
    data: TContext | null;
    cancellationTokenSource: CancellationTokenSource | null;
}

export class WorkflowContext<TContext> implements IWorkflowContext<TContext> {
    public data: TContext | null;

    public cancellationTokenSource: CancellationTokenSource | null = null;

    public constructor(data: TContext) {
        this.data = data;
    }

    public setCts(cts: CancellationTokenSource) {
        this.cancellationTokenSource = cts;
    }
}