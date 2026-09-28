import { WorkflowRunContext } from "./WorkflowRunContext";
import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowBuilder, WorkflowBuilder } from "./WorkflowBuilder";
import { WorkflowError, WorkflowErrorCode } from "./WorkflowError";
import { WorkflowRunArgs } from "./types/WorkflowRunArgs";
import { IWorkflowFinalBuilder } from "./interfaces/IWorkflowFinalBuilder";

export interface IWorkflow<TInput, TOutput> {
    run(...args: WorkflowRunArgs<TInput>): Promise<TOutput>;
}

export enum WorkflowStatus {
    /**
     * Completed status indicates the Workflow has completed.
     */
    Completed,
    /**
     * Faulted status indicates the Workflow through an error.
     */
    Faulted,
    /**
     * Pending status indicates the Workflow has not started yet.
     */
    Pending,
    /**
     * Running status indicates the Workflow is currently running and has not completed/faulted.
     */
    Running,
    /**
     * Stopped status indicates the Workflow has been stopped.
     */
    Stopped
}

/**
 * Abstract class to setup a custom workflow. Setup the workflow in the build method through the IWorkflowBuilder dependency 
 * by chaining various steps and conditions. Kick off the workflow by executing the run command on the Workflow instance.
 */
export abstract class Workflow<TInput, TResult> implements IWorkflow<TInput, TResult> {
    private _status: WorkflowStatus = WorkflowStatus.Pending;
    private _builder: WorkflowBuilder<TInput, TResult>;
    
    /**
     * The status of the Workflow.
     */
    public get status() {
        return this._status;
    }

    public constructor() {
        this._builder = new WorkflowBuilder<TInput, TResult>();

        this.build(this._builder);
    }

    /**
     * Build method to establish the various steps and conditions on the custom workflow.
     * @param {IWorkflowBuilder<TResult>} builder the IWorkflowBuilder dependency to establish the workflow steps.
     */
    public abstract build(builder: IWorkflowBuilder<TInput, TResult>)
        : IWorkflowFinalBuilder<any, TResult>;

    /**
     * Runs the workflow and returns a Promise of type TResult.
     * @param {CancellationTokenSource} cts The optional CancellationTokenSource to cancel the workflow.
     * @returns A Promise of type TResult.
     */
    public async run(...args: WorkflowRunArgs<TInput>): Promise<TResult> {
        const [input, sourceOrOptions] = args;
        const options = sourceOrOptions && "token" in sourceOrOptions
            ? { cancellationTokenSource: sourceOrOptions }
            : sourceOrOptions;
        const cts = options?.cancellationTokenSource ?? new CancellationTokenSource();
        const context = options && (options.onStarted || options.onCompleted || options.onFailed)
            ? new WorkflowRunContext(options)
            : undefined;
        this._status = WorkflowStatus.Running;
        try {
            const output = await this._builder.run(input as TInput, cts, context);
            this._status = WorkflowStatus.Completed;
            return output;
        } catch (error) {
            this._status = error instanceof WorkflowError && error.code === WorkflowErrorCode.Stopped
                ? WorkflowStatus.Stopped
                : WorkflowStatus.Faulted;
            context?.fail(error);
            throw error;
        } finally {
            context?.close();
        }
    }

}
