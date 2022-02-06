import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { WorkflowStepBuilderFinally } from "./WorkflowStepBuilderFinally";

export interface IWorkflowBuilder<TData> {
    startWith<TInput, TOutput>(step: { new(): WorkflowStep<TInput, TOutput, TData> }): IWorkflowStepBuilder<TInput, TOutput, TData>;
}

export class WorkflowBuilder<TData> implements IWorkflowBuilder<TData> {
    private _context: WorkflowContext<TData> = null;
    private _firstStep: WorkflowStepBuilderBase<any, any, TData> = null;

    public constructor(context: WorkflowContext<TData>) {
        this._context = context;
    }
    
    public startWith<TInput, TOutput>(step: { new(): WorkflowStep<TInput, TOutput, TData> }): IWorkflowStepBuilder<TInput, TOutput, TData> {
        let stepBuiler = new WorkflowStepBuilder(new step(), null, this._context);

        this._firstStep = stepBuiler;

        return stepBuiler;
    }

    public run(): Promise<TData> {
        return new Promise(async (resolve, reject) => {
            try {
                let step: WorkflowStepBuilderBase<any, any, TData> = this._firstStep;
                let output: any = null;
                let iteration: number = 0;

                while (step != null && ++iteration < 100) {
                    output = await step.run(output);

                    step = step.nextStep;

                    if (step.isFinal || step instanceof WorkflowStepBuilderFinally) break;
                }

                resolve(this._context.data);
            } catch (error: any) {
                reject(error);
            }
        });
    }
}