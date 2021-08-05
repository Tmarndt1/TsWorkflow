import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";

export enum WorkflowErrorOption {
    Retry,
    Terminate
}

export abstract class WorkflowStepBuilderBase<TInput, TOutput, TData> {
    public lastStep: WorkflowStepBuilderBase<any, TInput, TData> = null;
    public nextStep: WorkflowStepBuilderBase<TOutput, any, TData> = null;
    public currentStep: WorkflowStep<TInput, TOutput, TData> = null;
    public isFinal: boolean = false;
    protected context: WorkflowContext<TData> = null;
    protected delayTime: number = 0;
    protected errorOption: WorkflowErrorOption;
    protected retryMilliseconds: number = 0;

    public constructor(step: WorkflowStep<TInput, TOutput, TData>, last: WorkflowStepBuilderBase<any, any, any>, context: WorkflowContext<TData>) {
        this.currentStep = step;
        this.lastStep = last;
        this.context = context;
    }

    public abstract run(input: TInput): Promise<TOutput>;
}