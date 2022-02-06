import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowErrorOption, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowStepBuilderFinally<TInput, TResult, TContext> {
    delay(milliseconds: number): IWorkflowStepBuilderFinally<TInput, TResult, TContext>;
    onError(option: WorkflowErrorOption.Retry, milliseconds: number): void;
    onError(option: WorkflowErrorOption.Terminate): void;
}

export class WorkflowStepBuilderFinally<TInput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TResult, TContext> implements IWorkflowStepBuilderFinally<TInput, TResult, TContext> {
    public constructor(step: WorkflowStep<TInput, TResult, TContext>, last: WorkflowStepBuilder<any, any, TResult, TContext>, context: WorkflowContext<TContext>) {
        super(step, last, context);
        this.currentStep = step;
        this.lastStep = last;
        this.context = context;
        this.isFinal = true;
    }

    public delay(delay: number): IWorkflowStepBuilderFinally<TInput, TResult, TContext> {
        this.delayTime = delay;

        return this;
    }

    public onError(option: WorkflowErrorOption.Retry, milliseconds: number): void;
    public onError(option: WorkflowErrorOption.Terminate, param: void): void;
    public onError<T>(option: WorkflowErrorOption, param: T): void {
        this.errorOption = option;
        
        if (option === WorkflowErrorOption.Retry) this.retryMilliseconds = param as unknown as number;
    }

    public run(input: TInput): Promise<TResult> {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let output: TResult = await this.currentStep.run(input, this.context);

                    resolve(output);
                } 
                catch (error: any) {
                    if (this.errorOption === WorkflowErrorOption.Retry && !isNaN(this.retryMilliseconds)) {
                        let retry = setInterval(async () => {
                            try {
                                let output: TResult = await this.currentStep.run(input, this.context);

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