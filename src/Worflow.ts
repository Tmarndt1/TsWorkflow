import { WorkflowBuilder } from "./WorkflowBuilder";
import { WorkflowContext } from "./WorkflowContext";

export abstract class Workflow<TData> {
    public abstract id: string;
    public abstract version: string;
    public data: TData;
    private _builder: WorkflowBuilder<TData> = null;

    public constructor(data: TData) {
        this.data = data;
        this._builder = new WorkflowBuilder(new WorkflowContext(data));
    }

    public run(): Promise<TData> {
        return this._builder.run();
    }
}