import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { IWorkflowExecutorExt, WorkflowExecutor } from "./WorkflowExecutor";
import { WorkflowExecutorBase } from "./WorkflowExecutorBase";
import { WorkflowExecutorEnd } from "./WorkflowExecutorEnd";

export interface IWorkflowBuilder<TInput, TResult> {
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} builder The required WorfklowStep to start with.
     * @returns {WorkflowExecutor<TInput, TOutput, TResult>} A new WorkflowExecutor instance to chain additional steps or conditions.
     */
    startWith<TOutput>(builder: (() => IWorkflowStep<TInput, TOutput>) | ((input: TInput) => Promise<TOutput>)): IWorkflowExecutorExt<TInput, TOutput, TResult>;
}

/**
 * WorkflowBuilder class that allows for the chaining of various workflow steps and conditions. 
 */
export class WorkflowBuilder<TInput, TResult> implements IWorkflowBuilder<TInput, TResult> {
    private _executor: WorkflowExecutorBase<any, any, TResult> | null = null;

    public constructor() {
        
    }
    
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} factory The required WorfklowStep to start with.
     * @returns {WorkflowExecutor<TInput, TOutput, TResult>} A new WorkflowExecutor instance to chain additional steps or conditions.
     */
    public startWith<TOutput>(factory: () => IWorkflowStep<TInput, TOutput>): IWorkflowExecutorExt<TInput, TOutput, TResult> {
        this._executor = new WorkflowExecutor(factory);

        return this._executor as any as IWorkflowExecutorExt<TInput, TOutput, TResult>;
    }

    /**
     * Runs the first WorkflowStep and passes the output into the next WorkflowStep.
     * @param {CancellationTokenSource} cts The CancellationTokenSource to cancel the workflow.
     * @returns {Promise<TResult>} A Promise of type TResult.
     */
    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return new Promise(async (resolve, reject) => {
            let expiration: number = 0;
            let expired: boolean = false;
            let executor: WorkflowExecutorBase<any, any, TResult> = this._executor;
            let expirationTimeout: NodeJS.Timeout;

            while (executor != null) {
                executor = executor.getNext();

                if (!(executor instanceof WorkflowExecutorEnd)) continue;

                expiration = executor.expiration();
            }

            if (expiration > 0) {
                expirationTimeout = setTimeout(() => {
                    expired = true;

                    cts?.cancel();

                    reject(`Workflow expired after ${expiration} ms`);
                }, expiration);
            }

            try {
                let output: TResult = await this._executor?.run(input, cts);

                clearInterval(expirationTimeout);

                if (expired) return;
                
                resolve(output);
            } catch (error) {
                reject(error);
            }
        });
    }
}