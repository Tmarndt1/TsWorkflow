import CancellationTokenSource from "./CancellationTokenSource";

/**
 * IWorkflowContext interface contains the accessible properties between workflow steps.
 */
export interface IWorkflowContext<TContext> {
    data: TContext | null;
    cancellationTokenSource: CancellationTokenSource | null;
}

/**
 * WorkflowContext class contains the contextual data passed between workflow steps.
 */
export class WorkflowContext<TContext> implements IWorkflowContext<TContext> {
    public data: TContext | null;

    public cancellationTokenSource: CancellationTokenSource | null = null;

    public constructor(data: TContext, cts: CancellationTokenSource) {
        this.data = data;
        this.cancellationTokenSource = cts;
    }
}