import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowBuilder, WorkflowBuilder } from "./WorkflowBuilder";
import { WorkflowContext } from "./WorkflowContext";
import { IWorkflowStepBuilderFinal } from "./WorkflowStepBuilderFinal";

/**
 * Abstract class to setup a custom workflow. Setup the workflow in the build method through the IWorkflowBuilder dependency 
 * by chaining various steps and conditions. Kick off the workflow by executing the run command on the Workflow instance.
 */
export abstract class Workflow<TContext = void, TResult = void> {
    public abstract id: string;
    public abstract version: string;
    private _context: WorkflowContext<TContext>;
    private _builder: WorkflowBuilder<TContext, TResult> | null = null;

    public constructor(context: TContext) {
        this._context =  new WorkflowContext(context, new CancellationTokenSource());

        this._builder = new WorkflowBuilder<TContext, TResult>(this._context);

        this.build(this._builder);
    }

    /**
     * Build method to establish the various steps and conditions on the custom workflow.
     * @param {IWorkflowBuilder<TContext, TResult>} builder the IWorkflowBuilder dependency to establish the workflow steps.
     */
    public abstract build(builder: IWorkflowBuilder<TContext, TResult>)
        : IWorkflowStepBuilderFinal<any, TResult, TContext>;

    /**
     * Runs the workflow and returns a Promise of type TResult.
     * @param {CancellationTokenSource} cts The optional CancellationTokenSource to cancel the workflow.
     * @returns A Promise of type TResult.
     */
    public run(cts?: CancellationTokenSource): Promise<TResult> {
        return this._builder?.run(cts ?? this._context.cancellationTokenSource ?? new CancellationTokenSource()) ?? Promise.reject("Internal error in Workflow");
    }
}
