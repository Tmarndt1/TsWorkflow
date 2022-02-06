import { IWorkflowBuilder, WorkflowBuilder } from "./WorkflowBuilder";
import { IWorkflowContext, WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";

export abstract class Workflow<TData> {
    public abstract id: string;
    public abstract version: string;
    public abstract build(builder: IWorkflowBuilder<TData>): void;

    public data: TData;
    private _builder: WorkflowBuilder<TData> = null;

    public constructor(data: TData) {
        this.data = data;
        this._builder = new WorkflowBuilder(new WorkflowContext(data));
        this.build(this._builder);
    }

    public run(): Promise<TData> {
        return this._builder.run();
    }
}
