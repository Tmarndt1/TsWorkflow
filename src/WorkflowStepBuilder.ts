import CancellationTokenSource, { CancellationToken } from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowErrorHandler } from "./WorkflowErrorHandler";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilderBase, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderCondition, WorkflowStepBuilderCondition } from "./WorkflowStepBuilderCondition";
import { IWorkflowStepBuilderFinal, WorkflowStepBuilderFinal } from "./WorkflowStepBuilderFinal";

export interface IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> extends IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    if<TNextOutput>(func: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TNextOutput, TResult, TContext>;
    then<TNextOutput>(step: { new(): WorkflowStep<TOutput, TNextOutput, TContext> }): IWorkflowStepBuilder<TOutput, TNextOutput, TResult, TContext>;
    endWith(step: { new(): WorkflowStep<TOutput, TResult, TContext> }): IWorkflowStepBuilderFinal<TOutput, TResult, TContext>;
    delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
    timeout(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
}

export class WorkflowStepBuilder<TInput, TOutput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> implements IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
    private _onTimeoutStep: WorkflowStepBuilder<TInput, TOutput, TResult, TContext>;

    public constructor(step: WorkflowStep<TInput, TOutput, TContext>, last: WorkflowStepBuilderBase<any, any, TResult, TContext>, context: WorkflowContext<TContext>) {
        super(step, last, context);
        this._currentStep = step;
        this._lastStep = last;
        this._context = context;
    }
    
    public timeout(milliseconds: number ): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        if (milliseconds < 1) throw Error("Timeout must be a postive integer");
        
        this._timeout = milliseconds;
        
        return this;
    }

    public onTimeout(step: new () => WorkflowStep<TInput, TOutput, TContext>): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this._context);

        this._onTimeoutStep = stepBuiler;

        return this;
    }

    public if<TNextOutput>(func: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TNextOutput, TResult, TContext> {
        if (func == null) throw new Error("Conditional function cannot be null");
        
        let stepBuiler = new WorkflowStepBuilderCondition(this, this._context, func);

        this._nextStep = stepBuiler;

        return stepBuiler;
    }

    public delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        this._delayTime = milliseconds;
        
        return this;
    }

    public then<TNextOutput>(step: new () => WorkflowStep<TOutput, TNextOutput, TContext>): IWorkflowStepBuilder<TOutput, TNextOutput, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this._context);

        this._nextStep = stepBuiler;

        return stepBuiler;
    }

    public endWith(step: new () => WorkflowStep<TOutput, TResult, TContext>): IWorkflowStepBuilderFinal<TOutput, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilderFinal(new step(), this, this._context);

        this._nextStep = stepBuiler;

        return stepBuiler;
    }

    public hasNext(): boolean {
        return this._nextStep != null;
    }

    public getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext> {
        return this._nextStep;
    }

    public getTimeout(): number | null {
        return this._timeout;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TOutput> {
        let output: any = null;
        let timeoutMessage: string = `Step timed out after ${this._timeout} ms`;

        return new Promise((resolve, reject) => {
            if (cts?.token.isCancelled()) return reject("Workflow has been cancelled");

            try {
                let timeout: number = null;
                let delay: number = null;
                let hasTimeout: boolean = this._timeout > 0 && this._onTimeoutStep != null;
                let hasExpired: boolean = false;

                if (hasTimeout) {
                    timeout = setTimeout(async () => {
                        hasExpired = true;

                        cts.cancel();

                        clearTimeout(delay);

                        try {
                            await this._onTimeoutStep.run(input, cts);
                        } catch (error) {
                            reject(error);
                        }
                    }, this._timeout);
                }
    
                delay = setTimeout(async () => {
                    if (hasExpired) return reject(timeoutMessage);

                    if (this.hasNext()) {
                        try {
                            output = await this._currentStep.run(input, this._context, cts);
                        } catch (error) {
                            reject(error);
                        }

                        if (hasExpired) return reject(timeoutMessage);
    
                        clearTimeout(timeout);

                        try {
                            output = await this.getNext().run(output, cts);
                        } catch (error) {
                            reject(error);
                        }

                        if (hasExpired) return reject(timeoutMessage);
    
                        resolve(output);
                    } else {
                        try {
                            output = await this._currentStep.run(input, this._context, cts);
                        } catch (error) {
                            reject(error);
                        }

                        if (hasExpired) return reject(timeoutMessage);
    
                        clearTimeout(timeout);
    
                        resolve(output);
                    }
                }, this._delayTime);
            } catch (error) {
                reject(error);
            }
        });
    }
}