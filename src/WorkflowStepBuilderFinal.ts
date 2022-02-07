import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowErrorOption, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowStepBuilderFinal<TInput, TResult, TContext> {
    
}

export class WorkflowStepBuilderFinal<TInput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TResult, TResult, TContext> implements IWorkflowStepBuilderFinal<TInput, TResult, TContext> {
    public constructor(step: WorkflowStep<TInput, TResult, TContext>, last: WorkflowStepBuilder<any, any, TResult, TContext>, context: WorkflowContext<TContext>) {
        super(step, last, context);
        this.currentStep = step;
        this.lastStep = last;
        this.context = context;
    }

    public hasNext(): boolean {
        return this.nextStep != null;
    }

    public getNext(): WorkflowStepBuilderBase<TResult, any, TResult, TContext> {
        return null;
    }

    public run(input: TInput): Promise<TResult> {
        return new Promise((resolve) => {
            setTimeout(async () => {
                resolve(await this.currentStep.run(input, this.context));
            }, this.delayTime);
        });
    }
}