import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { WorkflowStepBuilderFinal } from "./WorkflowStepBuilderFinal";

export interface IWorkflowBuilder<TContext, TResult> {
    startWith<TInput, TOutput>(step: { new(): WorkflowStep<TInput, TOutput, TContext> }): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
}

export class WorkflowBuilder<TContext, TResult> implements IWorkflowBuilder<TContext, TResult> {
    private _context: WorkflowContext<TContext> | null = null;
    private _firstStep: WorkflowStepBuilderBase<any, any, TResult, TContext> | null = null;

    public constructor(context: WorkflowContext<TContext>) {
        this._context = context;
    }
    
    public startWith<TInput, TOutput>(step: { new(): WorkflowStep<TInput, TOutput, TContext> }): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        let stepBuiler = new WorkflowStepBuilder(new step(), null, this._context);

        this._firstStep = stepBuiler;

        return stepBuiler;
    }

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