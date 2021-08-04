import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowErrorOption, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowStepBuilderFinally<TInput, TData> {
    delay(milliseconds: number): IWorkflowStepBuilderFinally<TInput, TData>;
    onError(option: WorkflowErrorOption.Retry, milliseconds: number): void;
    onError(option: WorkflowErrorOption.Terminate): void;
}

export class WorkflowStepBuilderFinally<TInput, TData> extends WorkflowStepBuilderBase<TInput, void, TData> implements IWorkflowStepBuilderFinally<TInput, TData> {
    public lastStep: WorkflowStepBuilder<any, any, any> = null;

    public constructor(step: WorkflowStep<TInput, void, TData>, last: WorkflowStepBuilder<any, any, any>, context: WorkflowContext<TData>) {
        super(step, last, context);
        this.currentStep = step;
        this.lastStep = last;
        this.context = context;
    }

    public delay(delay: number): IWorkflowStepBuilderFinally<TInput, TData> {
        this.delayTime = delay;

        return this;
    }

    public onError(option: WorkflowErrorOption.Retry, milliseconds: number): void;
    public onError(option: WorkflowErrorOption.Terminate, param: void): void;
    public onError<T>(option: WorkflowErrorOption, param: T): void {
        this.errorOption = option;
        
        if (option === WorkflowErrorOption.Retry) this.retryMilliseconds = param as unknown as number;
    }

    public run(input: TInput): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let output: void = await this.currentStep.run(input, this.context);

                    resolve(output);
                } 
                catch (error: any) {
                    if (this.errorOption === WorkflowErrorOption.Retry && !isNaN(this.retryMilliseconds)) {
                        let retry = setInterval(async () => {
                            try {
                                let output: void = await this.currentStep.run(input, this.context);

                                resolve(output);

                                clearInterval(retry);
                            }
                            catch (error: any) {
                                // continue
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