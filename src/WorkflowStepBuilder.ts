import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowErrorOption, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderFinally, WorkflowStepBuilderFinally } from "./WorkflowStepBuilderFinally";

export interface IWorkflowStepBuilder<TInput, TOutput, TData> {
    delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TData>;
    then<TNextOutput>(step: { new(): WorkflowStep<TOutput, TNextOutput, TData> }): IWorkflowStepBuilder<TOutput, TNextOutput, TData>;
    endWith(step: { new(): WorkflowStep<TOutput, void, TData> }): IWorkflowStepBuilderFinally<TOutput, TData>;
    onError(option: WorkflowErrorOption.Retry, milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TData>;
    onError(option: WorkflowErrorOption.Terminate): IWorkflowStepBuilder<TInput, TOutput, TData>;
}

export class WorkflowStepBuilder<TInput, TOutput, TData> extends WorkflowStepBuilderBase<TInput, TOutput, TData> implements IWorkflowStepBuilder<TInput, TOutput, TData> {
    public isFinal: boolean = false;

    public constructor(step: WorkflowStep<TInput, TOutput, TData>, last: WorkflowStepBuilderBase<any, any, any>, context: WorkflowContext<TData>) {
        super(step, last, context);
        this.currentStep = step;
        this.lastStep = last;
        this.context = context;
    }

    public delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TData> {
        this.delayTime = milliseconds;

        return this;
    }

    public then<TNextOutput>(step: new () => WorkflowStep<TOutput, TNextOutput, TData>): IWorkflowStepBuilder<TOutput, TNextOutput, TData> {
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this.context);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    public endWith(step: new () => WorkflowStep<TOutput, void, TData>): IWorkflowStepBuilderFinally<TOutput, TData> {
        let stepBuiler = new WorkflowStepBuilderFinally(new step(), this, this.context);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    public onError(option: WorkflowErrorOption.Retry, milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TData>;
    public onError(option: WorkflowErrorOption.Terminate, param: void): IWorkflowStepBuilder<TInput, TOutput, TData>;
    public onError<T>(option: WorkflowErrorOption, param: T): IWorkflowStepBuilder<TInput, TOutput, TData> {
        
        this.errorOption = option;
        
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
                    if (this.errorOption === WorkflowErrorOption.Retry) {
                        let retry = setInterval(async () => {
                            try {
                                let output: TOutput = await this.currentStep.run(input, this.context);

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