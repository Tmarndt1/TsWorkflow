import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { IWorkflowStepBuilderBase, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowStepBuilderFinally<TInput, TData> extends IWorkflowStepBuilderBase<TInput, void, TData> {
    delay(milliseconds: number): IWorkflowStepBuilderFinally<TInput, TData>;
    onError(): IWorkflowStepBuilderFinally<TInput, TData>;
}

export class WorkflowStepBuilderFinally<TInput, TData> extends WorkflowStepBuilderBase<TInput, void, TData> implements IWorkflowStepBuilderFinally<TInput, TData> {
    public lastStep: WorkflowStepBuilder<any, any, any> = null;

    public constructor(step: WorkflowStep<TInput, void, TData>, last: WorkflowStepBuilder<any, any, any>, context: WorkflowContext<TData>) {
        super(step, last, context);
        this.currentStep = step;
        this.lastStep = last;
        this.context = context;
    }

    public delay(delay: number): IWorkflowStepBuilderFinally<TInput, TData> {
        this.delayTime = delay;

        return this;
    }

    public onError(): WorkflowStepBuilderFinally<TInput, TData> {
        
        return this;
    }

    public run(input: TInput): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    await this.currentStep.run(input, this.context);

                    resolve(null);
                }
                catch (error: any) {
                    // TODO: Hanlde on error
                    reject(error);
                }
            }, this.delayTime);
        });
    }
}