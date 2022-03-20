import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderCondition, WorkflowStepBuilderCondition } from "./WorkflowStepBuilderCondition";
import { IWorkflowStepBuilderFinal, WorkflowStepBuilderFinal } from "./WorkflowStepBuilderFinal";
import { IWorkflowStepBuilderParallel, WorkflowStepBuilderParallel } from "./WorkflowStepBuilderParallel";

export type ParallelType<T> = T extends { new(): WorkflowStep<unknown, infer TOutput, unknown> } ? TOutput : null;

export interface IWorkflowStepBuilderBasic<TInput, TOutput, TResult, TContext> {
    then<TNext>(step: { new(): WorkflowStep<TOutput, TNext, TContext> }): IWorkflowStepBuilder<TOutput, TNext, TResult, TContext>;
    endWith(step: { new(): WorkflowStep<TOutput, TResult, TContext> }): IWorkflowStepBuilderFinal<TOutput, TResult, TContext>;
    parallel<T extends { new(): WorkflowStep<any, any, TContext> }[] | []>(steps: T): IWorkflowStepBuilderParallel<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult, TContext>;
}

export interface IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> extends IWorkflowStepBuilderBasic<TInput, TOutput, TResult, TContext> {
    if(func: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TOutput, TResult, TContext>;
    delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
    timeout(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
    failed(step: { new(): WorkflowStep<any, any, TContext> }): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
}

export class WorkflowStepBuilder<TInput, TOutput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> implements IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
    private _step: WorkflowStep<TInput, TOutput, TContext>;
    private _last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>;
    private _next: WorkflowStepBuilderBase<TOutput, any, TResult, TContext>;

    public constructor(step: WorkflowStep<TInput, TOutput, TContext>,  
        last: WorkflowStepBuilderBase<any, any, TResult, TContext>, 
        context: WorkflowContext<TContext>) 
    {
        super(context);
        this._step = step;
        this._last = last;
        this._context = context;
    }

    public parallel<T extends (new () => WorkflowStep<any, any, TContext>)[] | []>(steps: T): IWorkflowStepBuilderParallel<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult, TContext> {
        if (!(steps instanceof Array)) throw Error("Steps must be an array");

        let instances = (steps as Array<new () => WorkflowStep<TInput, any, TContext>>).map(step => new step());

        let parallel = new WorkflowStepBuilderParallel(instances, this, this._context);

        this._next = parallel;

        return parallel as any;
    }

    public failed(step: new () => WorkflowStep<any, any, TContext>): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this._context);

        this._errorStep = stepBuiler;

        return this;
    }
    
    public timeout(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        if (milliseconds < 1) throw Error("Timeout must be a postive integer");
        
        this._timeout = milliseconds;
        
        return this;
    }

    public if(expression: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TOutput, TResult, TContext> {
        if (expression == null) throw new Error("Expression function cannot be null");
        
        let stepBuiler = new WorkflowStepBuilderCondition<TOutput, TOutput, TResult, TContext>(this, this._context, expression);

        this._next = stepBuiler;

        return stepBuiler;
    }

    public delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        this._delayTime = milliseconds;
        
        return this;
    }

    public then<TNext>(step: new () => WorkflowStep<TOutput, TNext, TContext>): IWorkflowStepBuilder<TOutput, TNext, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this._context);

        this._next = stepBuiler;

        return stepBuiler;
    }

    public endWith(step: new () => WorkflowStep<TOutput, TResult, TContext>): IWorkflowStepBuilderFinal<TOutput, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilderFinal(new step(), this, this._context);

        this._next = stepBuiler;

        return stepBuiler;
    }

    public hasNext(): boolean {
        return this._next != null;
    }

    public getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext> {
        return this._next;
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
                let hasTimeout: boolean = this._timeout > 0;
                let hasExpired: boolean = false;

                if (hasTimeout) {
                    timeout = setTimeout(async () => {
                        hasExpired = true;

                        cts.cancel();

                        clearTimeout(delay);

                        reject(timeoutMessage);
                    }, this._timeout);
                }
    
                delay = setTimeout(async () => {
                    if (hasExpired) return reject(timeoutMessage);

                    if (this.hasNext()) {
                        try {
                            output = await this._step.run(input, this._context);
                        } catch (error) {
                            if (this._errorStep != null) {
                                try {
                                    await this._errorStep.run(input, cts);
                                } catch (error) {
                                    return reject(error);
                                }
                            }

                            return reject(error);
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
                            output = await this._step.run(input, this._context);
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