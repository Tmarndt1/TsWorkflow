import { IWorkflowBuilder, WorkflowBuilder } from "./WorkflowBuilder";
import { WorkflowContext } from "./WorkflowContext";
import { IWorkflowStepBuilderFinally } from "./WorkflowStepBuilderFinally";

export abstract class Workflow<TContext, TResult> {
    public abstract id: string;
    public abstract version: string;
    public context: TContext;
    private _builder: WorkflowBuilder<TContext, TResult> = null;

    public constructor(data: TContext) {
        this.context = data;
        this._builder = new WorkflowBuilder<TContext, TResult>(new WorkflowContext(data));
        this.build(this._builder);
    }

    public abstract build(builder: IWorkflowBuilder<TContext, TResult>)
        : IWorkflowStepBuilderFinally<any, TResult, TContext>;

    public run(): Promise<TResult> {
        return this._builder.run();
    }
}
