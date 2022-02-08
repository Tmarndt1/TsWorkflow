import CancellationTokenSource, { CancellationToken } from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowErrorHandler } from "./WorkflowErrorHandler";
import { WorkflowStep } from "./WorkflowStep";

export interface IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {

}

export abstract class WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> implements IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    public lastStep: WorkflowStepBuilderBase<any, TInput, TResult, TContext> = null;
    protected nextStep: WorkflowStepBuilderBase<TOutput, any, TResult, TContext> = null;
    protected currentStep: WorkflowStep<TInput, TOutput, TContext> = null;
    protected context: WorkflowContext<TContext> = null;
    protected delayTime: number = 0;
    protected retryMilliseconds: number = 0;
    protected workflowErrorHandler: WorkflowErrorHandler = null;

    public constructor(step: WorkflowStep<TInput, TOutput, TContext>, last: WorkflowStepBuilderBase<any, any, TResult, TContext>, context: WorkflowContext<TContext>) {
        this.currentStep = step;
        this.lastStep = last; 
        this.context = context;
    }

    public abstract getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext>;

    public abstract hasNext(): boolean;

    public abstract run(input: TInput, cts: CancellationTokenSource): Promise<TOutput>;
}