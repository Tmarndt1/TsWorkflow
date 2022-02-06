import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilderBase, WorkflowErrorOption, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderFinally, WorkflowStepBuilderFinally } from "./WorkflowStepBuilderFinally";

export interface IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> extends IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    then<TNextOutput>(step: { new(): WorkflowStep<TOutput, TNextOutput, TContext> }): IWorkflowStepBuilder<TOutput, TNextOutput, TResult, TContext>;
    endWith(step: { new(): WorkflowStep<TOutput, TResult, TContext> }): IWorkflowStepBuilderFinally<TOutput, TResult, TContext>;
}

export class WorkflowStepBuilder<TInput, TOutput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> implements IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
    public constructor(step: WorkflowStep<TInput, TOutput, TContext>, last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>, context: WorkflowContext<TContext>) {
        super(step, last, context);
        this.currentStep = step;
        this.lastStep = last;
        this.context = context;
    }

    public then<TNextOutput>(step: new () => WorkflowStep<TOutput, TNextOutput, TContext>): IWorkflowStepBuilder<TOutput, TNextOutput, TResult, TContext> {
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this.context);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    public endWith(step: new () => WorkflowStep<TOutput, TResult, TContext>): IWorkflowStepBuilderFinally<TOutput, TResult, TContext> {
        let stepBuiler = new WorkflowStepBuilderFinally(new step(), this, this.context);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    public hasNext(): boolean {
        return this.nextStep != null;
    }

    public getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext> {
        return this.nextStep;
    }
}