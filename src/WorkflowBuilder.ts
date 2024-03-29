import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { WorkflowNextBuilder } from "./WorkflowNextBuilder";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowFinalBuilder } from "./WorkflowFinalBuilder";
import { Workflow } from "./Workflow";
import { WorkflowError } from "./WorkfowError";
import { IWorkflowNextExtBuilder } from "./interfaces/IWorkflowNextExtBuilder";
import { verifyNullOrThrow } from "./functions/verifyNullOrThrow";

export interface IWorkflowBuilder<TInput, TResult> {
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} factory The required WorfklowStep to start with.
     * @returns {WorkflowNextBuilder<TInput, TOutput, TResult>} A new Workflowbuilder instance to chain additional steps or conditions.
     */
    startWith<TOutput>(factory: () => IWorkflowStep<TInput, TOutput>): IWorkflowNextExtBuilder<TInput, TOutput, TResult>;
}

/**
 * WorkflowBuilder class that allows for the chaining of various workflow steps and conditions. 
 */
export class WorkflowBuilder<TInput, TResult> implements IWorkflowBuilder<TInput, TResult> {
    private readonly _workflow: Workflow<TInput, TResult>;
    private _builder: WorkflowStepBuilder<any, any, TResult> | null = null;

    public constructor(workflow: Workflow<TInput, TResult>) {
        this._workflow = workflow;
    }
    
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} func The required WorfklowStep to start with.
     * @returns {WorkflowNextBuilder<TInput, TOutput, TResult>} A new Workflowbuilder instance to chain additional steps or conditions.
     */
    public startWith<TOutput>(func: () => IWorkflowStep<TInput, TOutput>): IWorkflowNextExtBuilder<TInput, TOutput, TResult> {
        verifyNullOrThrow(func);

        this._builder = new WorkflowNextBuilder(func, this._workflow);

        return this._builder as any as IWorkflowNextExtBuilder<TInput, TOutput, TResult>;
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
            let builder: WorkflowStepBuilder<any, any, TResult> = this._builder;
            let expirationTimeout: NodeJS.Timeout;

            while (builder != null) {
                builder = builder.getNext();

                if (!(builder instanceof WorkflowFinalBuilder)) continue;

                expiration = builder.expiration();
            }

            if (expiration > 0) {
                expirationTimeout = setTimeout(() => {
                    expired = true;

                    cts?.cancel();

                    reject(WorkflowError.expired(expiration));
                }, expiration);
            }

            try {
                let output: TResult = await this._builder?.run(input, cts);

                clearInterval(expirationTimeout);

                if (expired) return;
                
                resolve(output);
            } catch (error) {                
                reject(error);
            }
        });
    }
}