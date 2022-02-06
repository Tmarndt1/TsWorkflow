import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowErrorOption, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowStepBuilderFinally<TInput, TResult, TContext> {
    delay(milliseconds: number): IWorkflowStepBuilderFinally<TInput, TResult, TContext>;
    onError(option: WorkflowErrorOption.Retry, milliseconds: number): void;
    onError(option: WorkflowErrorOption.Terminate): void;
}

export class WorkflowStepBuilderFinally<TInput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TResult, TResult, TContext> implements IWorkflowStepBuilderFinally<TInput, TResult, TContext> {
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
}