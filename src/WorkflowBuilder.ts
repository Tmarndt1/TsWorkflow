import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { WorkflowStepBuilderFinal } from "./WorkflowStepBuilderEnd";

export interface IWorkflowBuilder<TResult> {
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} builder The required WorfklowStep to start with.
     * @returns {WorkflowStepBuilder<TInput, TOutput, TResult>} A new WorkflowStepBuilder instance to chain additional steps or conditions.
     */
    startWith<TInput, TOutput>(builder: () => WorkflowStep<TInput, TOutput>): IWorkflowStepBuilder<TInput, TOutput, TResult>;
}

/**
 * WorkflowBuilder class that allows for the chaining of various workflow steps and conditions. 
 */
export class WorkflowBuilder<TResult> implements IWorkflowBuilder<TResult> {
    private _firstStep: WorkflowStepBuilderBase<any, any, TResult> | null = null;

    public constructor() {
        
    }
    
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} factory The required WorfklowStep to start with.
     * @returns {WorkflowStepBuilder<TInput, TOutput, TResult>} A new WorkflowStepBuilder instance to chain additional steps or conditions.
     */
    public startWith<TInput, TOutput>(factory: () => WorkflowStep<TInput, TOutput>): IWorkflowStepBuilder<TInput, TOutput, TResult> {
        let stepBuiler = new WorkflowStepBuilder(factory);

        this._firstStep = stepBuiler;

        return stepBuiler;
    }

    /**
     * Runs the first WorkflowStep and passes the output into the next WorkflowStep.
     * @param {CancellationTokenSource} cts The CancellationTokenSource to cancel the workflow.
     * @returns {Promise<TResult>} A Promise of type TResult.
     */
    public run(cts: CancellationTokenSource): Promise<TResult> {
        return new Promise(async (resolve, reject) => {
            let step = this._firstStep;

            while (step?.hasNext()) {
                step = step.getNext();
            }

            let expiration: number | null = 0;
    
            if (step instanceof WorkflowStepBuilderFinal) {
                expiration = step.getExpiration();
            }
    
            if (expiration != null && expiration > 0) {
                setTimeout(() => {
                    cts?.cancel();

                    reject(`Workflow expired after ${expiration} ms`);
                }, expiration);
            }

            try {
                resolve(await this._firstStep?.run(null, cts));
            } catch (error) {
                reject(error);
            }
        });
    }
}