import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { IWorkflowNextExtendedBuilder, WorkflowNextBuilder } from "./WorkflowNextBuilder";
import { WorkflowBaseBuilder } from "./WorkflowBaseBuilder";
import { WorkflowFinalBuilder } from "./WorkflowFinalBuilder";

export interface IWorkflowBuilder<TInput, TResult> {
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} factory The required WorfklowStep to start with.
     * @returns {WorkflowNextBuilder<TInput, TOutput, TResult>} A new Workflowbuilder instance to chain additional steps or conditions.
     */
    startWith<TOutput>(factory: () => IWorkflowStep<TInput, TOutput>): IWorkflowNextExtendedBuilder<TInput, TOutput, TResult>;
}

/**
 * WorkflowBuilder class that allows for the chaining of various workflow steps and conditions. 
 */
export class WorkflowBuilder<TInput, TResult> implements IWorkflowBuilder<TInput, TResult> {
    private _builder: WorkflowBaseBuilder<any, any, TResult> | null = null;

    public constructor() {
        
    }
    
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} factory The required WorfklowStep to start with.
     * @returns {WorkflowNextBuilder<TInput, TOutput, TResult>} A new Workflowbuilder instance to chain additional steps or conditions.
     */
    public startWith<TOutput>(factory: () => IWorkflowStep<TInput, TOutput>): IWorkflowNextExtendedBuilder<TInput, TOutput, TResult> {
        this._builder = new WorkflowNextBuilder(factory);

        return this._builder as any as IWorkflowNextExtendedBuilder<TInput, TOutput, TResult>;
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
            let builder: WorkflowBaseBuilder<any, any, TResult> = this._builder;
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

                    reject(`Workflow expired after ${expiration} ms`);
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