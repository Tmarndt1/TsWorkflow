import { WorkflowContext } from "./WorkflowContext";
import { WorkflowErrorHandler } from "./WorkflowErrorHandler";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowStepBuilderFinal<TInput, TResult, TContext> {
    onError(option: WorkflowErrorHandler): IWorkflowStepBuilderFinal<TInput, TResult, TContext>;
    timeout(milliseconds: number): IWorkflowStepBuilderFinal<TInput, TResult, TContext>;
}

export class WorkflowStepBuilderFinal<TInput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TResult, TResult, TContext> implements IWorkflowStepBuilderFinal<TInput, TResult, TContext> {
    private _timeout: number | null = null;
    
    public constructor(step: WorkflowStep<TInput, TResult, TContext>, last: WorkflowStepBuilder<any, any, TResult, TContext>, context: WorkflowContext<TContext>) {
        super(step, last, context);
        this.currentStep = step;
        this.lastStep = last;
        this.context = context;
    }
    
    public timeout(milliseconds: number): IWorkflowStepBuilderFinal<TInput, TResult, TContext> {
        this._timeout = milliseconds;
        return this;
    }
    
    public onError(option: WorkflowErrorHandler): IWorkflowStepBuilderFinal<TInput, TResult, TContext> {
        this.workflowErrorHandler = option;
        return this;
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