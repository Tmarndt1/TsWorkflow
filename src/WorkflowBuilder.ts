import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep, WorkflowStep } from "./WorkflowStep";
import { IWorkflowExecutorExt, WorkflowExecutor } from "./executors/WorkflowExecutor";
import { WorkflowExecutorBase } from "./executors/WorkflowExecutorBase";
import { WorkflowExecutorFinal } from "./executors/WorkflowExecutorEnd";

export interface IWorkflowBuilder<TResult> {
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} builder The required WorfklowStep to start with.
     * @returns {WorkflowExecutor<TInput, TOutput, TResult>} A new WorkflowExecutor instance to chain additional steps or conditions.
     */
    startWith<TInput, TOutput>(builder: (() => IWorkflowStep<TInput, TOutput>) | ((input: TInput) => Promise<TOutput>)): IWorkflowExecutorExt<TInput, TOutput, TResult>;
}

/**
 * WorkflowBuilder class that allows for the chaining of various workflow steps and conditions. 
 */
export class WorkflowBuilder<TResult> implements IWorkflowBuilder<TResult> {
    private _executor: WorkflowExecutorBase<any, any, TResult> | null = null;

    public constructor() {
        
    }
    
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} factory The required WorfklowStep to start with.
     * @returns {WorkflowExecutor<TInput, TOutput, TResult>} A new WorkflowExecutor instance to chain additional steps or conditions.
     */
    public startWith<TInput, TOutput>(factory: () => IWorkflowStep<TInput, TOutput>): IWorkflowExecutorExt<TInput, TOutput, TResult> {
        this._executor = new WorkflowExecutor(factory);

        return this._executor as any as IWorkflowExecutorExt<TInput, TOutput, TResult>;
    }

    /**
     * Runs the first WorkflowStep and passes the output into the next WorkflowStep.
     * @param {CancellationTokenSource} cts The CancellationTokenSource to cancel the workflow.
     * @returns {Promise<TResult>} A Promise of type TResult.
     */
    public run(cts: CancellationTokenSource): Promise<TResult> {
        return new Promise(async (resolve, reject) => {
            let step = this._executor;

            while (step?.hasNext()) {
                step = step.getNext();
            }

            let expiration: number | null = 0;
    
            if (step instanceof WorkflowExecutorFinal) {
                expiration = step.getExpiration();
            }
    
            if (expiration != null && expiration > 0) {
                setTimeout(() => {
                    cts?.cancel();

                    reject(`Workflow expired after ${expiration} ms`);
                }, expiration);
            }

            try {
                resolve(await this._executor?.run(null, cts));
            } catch (error) {
                reject(error);
            }
        });
    }
}