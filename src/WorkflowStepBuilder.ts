import { WorkflowContext } from "./WorkflowContext";
import { WorkflowErrorHandler } from "./WorkflowErrorHandler";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilderBase, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderCondition, WorkflowStepBuilderCondition } from "./WorkflowStepBuilderCondition";
import { IWorkflowStepBuilderFinal, WorkflowStepBuilderFinal } from "./WorkflowStepBuilderFinal";

export interface IWorkflowStepBuilderOnTimeout<TInput, TOutput, TResult, TContext> extends IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
    onTimeout(step: { new(): WorkflowStep<TInput, TResult, TContext> }): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
}

export interface IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> extends IWorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> {
    if<TNextOutput>(func: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TNextOutput, TResult, TContext>;
    then<TNextOutput>(step: { new(): WorkflowStep<TOutput, TNextOutput, TContext> }): IWorkflowStepBuilder<TOutput, TNextOutput, TResult, TContext>;
    endWith(step: { new(): WorkflowStep<TOutput, TResult, TContext> }): IWorkflowStepBuilderFinal<TOutput, TResult, TContext>;
    delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
    timeout(milliseconds: number): IWorkflowStepBuilderOnTimeout<TInput, TOutput, TResult, TContext>;
    onError(option: WorkflowErrorHandler): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
}

export class WorkflowStepBuilder<TInput, TOutput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> implements IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
    public id: string;
    private _timeout: number | null = null;
    private _onTimeoutStep: WorkflowStep<TInput, TResult, TContext>;

    public constructor(step: WorkflowStep<TInput, TOutput, TContext>, last: WorkflowStepBuilderBase<any, any, TResult, TContext>, context: WorkflowContext<TContext>) {
        super(step, last, context);
        this.currentStep = step;
        this.lastStep = last;
        this.context = context;
    }
    
    public timeout(milliseconds: number): IWorkflowStepBuilderOnTimeout<TInput, TOutput, TResult, TContext> {
        this._timeout = milliseconds;
        return this;
    }

    public onTimeout(step: new () => WorkflowStep<TInput, TResult, TContext>): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this.context);

        this._onTimeoutStep = stepBuiler;

        return this;
    }

    public onError(option: WorkflowErrorHandler): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        this.workflowErrorHandler = option;
        return this;
    }

    public if<TNextOutput>(func: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TNextOutput, TResult, TContext> {
        if (func == null) throw new Error("Conditional function cannot be null");
        
        let stepBuiler = new WorkflowStepBuilderCondition(this, this.context, func);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    public delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        this.delayTime = milliseconds;
        return this;
    }

    public then<TNextOutput>(step: new () => WorkflowStep<TOutput, TNextOutput, TContext>): IWorkflowStepBuilder<TOutput, TNextOutput, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this.context);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    public endWith(step: new () => WorkflowStep<TOutput, TResult, TContext>): IWorkflowStepBuilderFinal<TOutput, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilderFinal(new step(), this, this.context);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    public hasNext(): boolean {
        return this.nextStep != null;
    }

    public getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext> {
        return this.nextStep;
    }

    public run(input: TInput): Promise<TOutput> {
        let output: any = null;

        return new Promise((resolve, reject) => {
            try {
                let timeout: number = null;
                let delay: number = null;

                if (this._timeout > 0 && this._onTimeoutStep != null) {
                    timeout = setTimeout(() => {
                        clearInterval(delay);

                        this._onTimeoutStep.run(input, this.context);
                        
                        reject(`Promise timed out after ${this._timeout} ms`);
                    }, this._timeout);
                }
    
                delay = setTimeout(async () => {
                    if (this.hasNext()) {
                        output = await this.currentStep.run(input, this.context);
    
                        clearTimeout(timeout);
    
                        output = await this.getNext().run(output);
    
                        resolve(output);
                    } else {
                        output = await this.currentStep.run(input, this.context);
    
                        clearTimeout(timeout);
    
                        resolve(output);
                    }
                }, this.delayTime);
            } catch (error) {
                reject(error);
            }
        });
    }
}