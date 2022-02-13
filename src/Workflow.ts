import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowBuilder, WorkflowBuilder } from "./WorkflowBuilder";
import { WorkflowContext } from "./WorkflowContext";
import { IWorkflowStepBuilderFinal } from "./WorkflowStepBuilderFinal";

export abstract class Workflow<TContext = void, TResult = void> {
    public abstract id: string;
    public abstract version: string;
    private _context: WorkflowContext<TContext>;
    private _builder: WorkflowBuilder<TContext, TResult> = null;

    public constructor(context: TContext) {
        this._context =  new WorkflowContext(context);

        this._builder = new WorkflowBuilder<TContext, TResult>(this._context);

        this.build(this._builder);
    }

    public abstract build(builder: IWorkflowBuilder<TContext, TResult>)
        : IWorkflowStepBuilderFinal<any, TResult, TContext>;

    public run(cts?: CancellationTokenSource): Promise<TResult> {
        cts = cts ?? new CancellationTokenSource();

        this._context.setCancellationTokenSource(cts);

        return this._builder.run(cts);
    }
}
