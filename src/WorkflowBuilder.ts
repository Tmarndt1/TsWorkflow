import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { WorkflowStepBuilderFinally } from "./WorkflowStepBuilderFinally";

export interface IWorkflowBuilder<TContext, TResult> {
    startWith<TInput, TOutput>(step: { new(): WorkflowStep<TInput, TOutput, TContext> }): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
}

export class WorkflowBuilder<TContext, TResult> implements IWorkflowBuilder<TContext, TResult> {
    private _context: WorkflowContext<TContext> = null;
    private _firstStep: WorkflowStepBuilderBase<any, any, TContext> = null;

    public constructor(context: WorkflowContext<TContext>) {
        this._context = context;
    }
    
    public startWith<TInput, TOutput>(step: { new(): WorkflowStep<TInput, TOutput, TContext> }): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        let stepBuiler = new WorkflowStepBuilder(new step(), null, this._context);

        this._firstStep = stepBuiler;

        return stepBuiler;
    }

    public run(): Promise<TResult> {
        return new Promise(async (resolve, reject) => {
            try {
                let step: WorkflowStepBuilderBase<any, any, TContext> = this._firstStep;
                let output: TResult = null;
                let iteration: number = 0;

                while (step != null && ++iteration < 100) {
                    output = await step.run(output);

                    step = step.nextStep;

                    if (step.isFinal || step instanceof WorkflowStepBuilderFinally) break;
                }

                resolve(output);
            } catch (error: any) {
                reject(error);
            }
        });
    }
}