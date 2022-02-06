
export interface IWorkflowContext<TContext> {
    data: TContext
}

export class WorkflowContext<TContext> implements IWorkflowContext<TContext> {
    public data: TContext;

    public constructor(data: TContext) {
        this.data = data;
    }
}