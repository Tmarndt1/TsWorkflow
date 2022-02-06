import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowErrorOption, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderFinally, WorkflowStepBuilderFinally } from "./WorkflowStepBuilderFinally";

export interface IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
    delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
    then<TNextOutput>(step: { new(): WorkflowStep<TOutput, TNextOutput, TContext> }): IWorkflowStepBuilder<TOutput, TNextOutput, TResult, TContext>;
    endWith(step: { new(): WorkflowStep<TOutput, TResult, TContext> }): IWorkflowStepBuilderFinally<TOutput, TResult, TContext>;
    onError(option: WorkflowErrorOption.Retry, milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
    onError(option: WorkflowErrorOption.Terminate): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
}

export class WorkflowStepBuilder<TInput, TOutput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TOutput, TContext> implements IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
    public constructor(step: WorkflowStep<TInput, TOutput, TContext>, last: WorkflowStepBuilderBase<any, TInput, TContext>, context: WorkflowContext<TContext>) {
        super(step, last, context);
        this.currentStep = step;
        this.lastStep = last;
        this.context = context;
    }

    public delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        this.delayTime = milliseconds;

        return this;
    }

    public then<TNextOutput>(step: new () => WorkflowStep<TOutput, TNextOutput, TContext>): IWorkflowStepBuilder<TOutput, TNextOutput, TResult, TContext> {
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this.context);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    // public segway<TNextOutput>(): IWorkflowStepBuilder<TOutput, TNextOutput, TContext> {
    //     let stepBuiler = new WorkflowStepBuilder(new step(), this, this.context);

    //     this.nextStep = stepBuiler;

    //     return stepBuiler;
    // }

    public endWith(step: new () => WorkflowStep<TOutput, TResult, TContext>): IWorkflowStepBuilderFinally<TOutput, TResult, TContext> {
        let stepBuiler = new WorkflowStepBuilderFinally(new step(), this, this.context);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    public onError(option: WorkflowErrorOption.Retry, milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
    public onError(option: WorkflowErrorOption.Terminate, param: void): IWorkflowStepBuilder<TInput, TOutput, TResult,TContext>;
    public onError<T>(option: WorkflowErrorOption, param: T): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
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
                    if (this.errorOption === WorkflowErrorOption.Retry) {
                        let retry = setInterval(async () => {
                            try {
                                let output: TOutput = await this.currentStep.run(input, this.context);

                                resolve(output);

                                clearInterval(retry);
                            }
                            catch (error: any) {
                                reject(error);
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