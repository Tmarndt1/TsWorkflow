import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { WorkflowStepBuilderFinal } from "./WorkflowStepBuilderFinal";

export interface IWorkflowBuilder<TContext, TResult> {
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} step The required WorfklowStep to start with.
     * @returns {WorkflowStepBuilder<TInput, TOutput, TResult, TContext>} A new WorkflowStepBuilder instance to chain additional steps or conditions.
     */
    startWith<TInput, TOutput>(step: { new(): WorkflowStep<TInput, TOutput, TContext> }): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
}

/**
 * WorkflowBuilder class that allows for the chaining of various workflow steps and conditions. 
 */
export class WorkflowBuilder<TContext, TResult> implements IWorkflowBuilder<TContext, TResult> {
    private _context: WorkflowContext<TContext> | null = null;
    private _firstStep: WorkflowStepBuilderBase<any, any, TResult, TContext> | null = null;

    public constructor(context: WorkflowContext<TContext>) {
        this._context = context;
    }
    
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} step The required WorfklowStep to start with.
     * @returns {WorkflowStepBuilder<TInput, TOutput, TResult, TContext>} A new WorkflowStepBuilder instance to chain additional steps or conditions.
     */
    public startWith<TInput, TOutput>(step: { new(): WorkflowStep<TInput, TOutput, TContext> }): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        let stepBuiler = new WorkflowStepBuilder(new step(), null, this._context);

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
                    cts.cancel();

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