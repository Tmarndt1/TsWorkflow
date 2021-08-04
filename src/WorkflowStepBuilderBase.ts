import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";

export interface IWorkflowStepBuilderBase<TInput, TOutput, TData> {
    delay(milliseconds: number): IWorkflowStepBuilderBase<TInput, TOutput, TData>;
    onError(): IWorkflowStepBuilderBase<TInput, TOutput, TData>;
}

export abstract class WorkflowStepBuilderBase<TInput, TOutput, TData> {
    public lastStep: WorkflowStepBuilderBase<any, any, any> = null;
    public currentStep: WorkflowStep<TInput, TOutput, TData> = null;
    protected context: WorkflowContext<TData> = null;
    protected delayTime: number = 0;

    public constructor(step: WorkflowStep<TInput, TOutput, TData>, last: WorkflowStepBuilder<any, any, any>, context: WorkflowContext<TData>) {
        this.currentStep = step;
        this.lastStep = last;
        this.context = context;
    }

    public abstract delay(milliseconds: number): IWorkflowStepBuilderBase<TInput, TOutput, TData>;

    public abstract onError(): IWorkflowStepBuilderBase<TInput, TOutput, TData>;
}