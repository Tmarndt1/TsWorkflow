import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";

export enum WorkflowErrorOption {
    Retry,
    Terminate
}

export abstract class WorkflowStepBuilderBase<TInput, TOutput, TContext> {
    public lastStep: WorkflowStepBuilderBase<any, TInput, TContext> = null;
    public nextStep: WorkflowStepBuilderBase<TOutput, any, TContext> = null;
    public currentStep: WorkflowStep<TInput, TOutput, TContext> = null;
    public isFinal: boolean = false;
    protected context: WorkflowContext<TContext> = null;
    protected delayTime: number = 0;
    protected errorOption: WorkflowErrorOption;
    protected retryMilliseconds: number = 0;

    public constructor(step: WorkflowStep<TInput, TOutput, TContext>, last: WorkflowStepBuilderBase<any, any, any>, context: WorkflowContext<TContext>) {
        this.currentStep = step;
        this.lastStep = last;
        this.context = context;
    }

    public abstract run(input: TInput): Promise<TOutput>;
}