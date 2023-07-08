import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowBuilder, WorkflowBuilder } from "./WorkflowBuilder";
import { IWorkflowStepBuilderEnd } from "./WorkflowStepBuilderEnd";

/**
 * Abstract class to setup a custom workflow. Setup the workflow in the build method through the IWorkflowBuilder dependency 
 * by chaining various steps and conditions. Kick off the workflow by executing the run command on the Workflow instance.
 */
export abstract class Workflow<TResult = void> {
    public abstract id: string;
    public abstract version: string;
    private _builder: WorkflowBuilder<TResult> | null = null;

    public constructor() {
        this._builder = new WorkflowBuilder<TResult>();

        this.build(this._builder);
    }

    /**
     * Build method to establish the various steps and conditions on the custom workflow.
     * @param {IWorkflowBuilder<TResult>} builder the IWorkflowBuilder dependency to establish the workflow steps.
     */
    public abstract build(builder: IWorkflowBuilder<TResult>)
        : IWorkflowStepBuilderEnd<any, TResult>;

    /**
     * Runs the workflow and returns a Promise of type TResult.
     * @param {CancellationTokenSource} cts The optional CancellationTokenSource to cancel the workflow.
     * @returns A Promise of type TResult.
     */
    public run(cts?: CancellationTokenSource): Promise<TResult> {
        return this._builder?.run(cts ?? new CancellationTokenSource()) ?? Promise.reject("Internal error in Workflow");
    }
}
