import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";

export enum WorkflowErrorOption {
    Retry,
    Terminate
}

export interface IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    delay(milliseconds: number): IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext>;
    onError(option: WorkflowErrorOption.Retry, milliseconds: number): IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext>;
    onError(option: WorkflowErrorOption.Terminate): IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext>;
}

export abstract class WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> implements IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    public lastStep: WorkflowStepBuilderBase<any, TInput, TResult, TContext> = null;
    protected nextStep: WorkflowStepBuilderBase<TOutput, any, TResult, TContext> = null;
    protected currentStep: WorkflowStep<TInput, TOutput, TContext> = null;
    protected context: WorkflowContext<TContext> = null;
    protected delayTime: number = 0;
    protected errorOption: WorkflowErrorOption;
    protected retryMilliseconds: number = 0;

    public constructor(step: WorkflowStep<TInput, TOutput, TContext>, last: WorkflowStepBuilderBase<any, any, TResult, TContext>, context: WorkflowContext<TContext>) {
        this.currentStep = step;
        this.lastStep = last; 
        this.context = context;
    }

    public abstract getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext>;

    public abstract hasNext(): boolean;

    public delay(milliseconds: number): IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
        this.delayTime = milliseconds;

        return this;
    }

    public onError(option: WorkflowErrorOption.Retry, milliseconds: number): IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext>;
    public onError(option: WorkflowErrorOption.Terminate, param: void): IWorkflowStepBuilderBase<TInput, TOutput, TResult,TContext>;
    public onError<T>(option: WorkflowErrorOption, param: T): IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
        this.errorOption = option;

        if (option === WorkflowErrorOption.Retry) this.retryMilliseconds = param as unknown as number;
        
        return this;
    }

    public run(input: TInput): Promise<TOutput> {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let output: TOutput = await this.currentStep.run(input, this.context);

                    resolve(output);
                } 
                catch (error: any) {
                    if (this.errorOption === WorkflowErrorOption.Retry && !isNaN(this.retryMilliseconds)) {
                        let retry = setInterval(async () => {
                            try {
                                let output: TOutput = await this.currentStep.run(input, this.context);

                                resolve(output);

                                clearInterval(retry);
                            }
                            catch (error: any) {
                                reject(error)
                            }
                        }, this.retryMilliseconds);
                    } else if (this.errorOption === WorkflowErrorOption.Terminate) {
                        reject(error);
                    }
                }
            }, this.delayTime);
        });
    }
}