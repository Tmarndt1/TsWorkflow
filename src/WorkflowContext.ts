import CancellationTokenSource from "./CancellationTokenSource";

export interface IWorkflowContext<TContext> {
    data: TContext
    cancellationTokenSource: CancellationTokenSource;
}

export class WorkflowContext<TContext> implements IWorkflowContext<TContext> {
    public data: TContext;
    public cancellationTokenSource: CancellationTokenSource;

    public constructor(data: TContext) {
        this.data = data;
    }

    public setCts(cts: CancellationTokenSource) {
        this.cancellationTokenSource = cts;
    }
}