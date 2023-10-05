import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowBuilder, WorkflowBuilder } from "./WorkflowBuilder";
import { IWorkflowFinalBuilder } from "./WorkflowFinalBuilder";
import { WorkflowError } from "./WorkfowError";

export interface IWorkflow<TInput, TOutput> {
    run(input: TInput, cts?: CancellationTokenSource): Promise<TOutput>;
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
    Stopped,
    /**
     * Waiting status indidcates the Workflow is waiting for an event to occur.
     */
    Waiting,
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
        this._builder = new WorkflowBuilder<TInput, TResult>(this);

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
    public run(input?: TInput, cts?: CancellationTokenSource): Promise<TResult> {
        if (this._builder == null) {
            this._status = WorkflowStatus.Faulted;

            return Promise.reject("Interal workflow error");
        }

        this._status = WorkflowStatus.Running;

        return new Promise((resolve, reject) => {
            this._builder?.run(input, cts ?? new CancellationTokenSource())
            .then(res => {
                this._status = WorkflowStatus.Completed;

                resolve(res);
            })
            .catch(err => {
                if (err === WorkflowError.stopped()) {
                    this._status = WorkflowStatus.Stopped;
                } else {
                    this._status = WorkflowStatus.Faulted;
                }

                reject(err);
            });
        });
    }
}

export function setWorkflowStatus(workflow: Workflow<any, any>, status: WorkflowStatus) {
    workflow["_status"] = status;
}
