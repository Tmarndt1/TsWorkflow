
export interface IWorkflowContext<TData> {
    data: TData
}

export class WorkflowContext<TData> implements IWorkflowContext<TData> {
    public data: TData;

    public constructor(data: TData) {
        this.data = data;
    }
}