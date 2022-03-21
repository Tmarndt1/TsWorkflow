import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderCondition, WorkflowStepBuilderCondition } from "./WorkflowStepBuilderCondition";
import { IWorkflowStepBuilderFinal, WorkflowStepBuilderFinal } from "./WorkflowStepBuilderFinal";

type ReturnType<T> = T extends { new(): WorkflowStep<unknown, infer TOutput, unknown> }
    ? TOutput : null;

export interface IWorkflowStepBuilderParallel<TInput, TOutput, TResult, TContext>{
    if<TNext>(func: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TNext, TResult, TContext>;
    then<TNext>(step: { new(): WorkflowStep<TOutput, TNext, TContext> }): IWorkflowStepBuilder<TOutput, TNext, TResult, TContext>;
    endWith(step: { new(): WorkflowStep<TOutput, TResult, TContext> }): IWorkflowStepBuilderFinal<TOutput, TResult, TContext>;
    delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
    timeout(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
    error(step: { new(): WorkflowStep<any, any, TContext> }): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
    parallel<T extends { new(): WorkflowStep<any, any, TContext> }[] | []>(steps: T): IWorkflowStepBuilderParallel<TOutput, { -readonly [P in keyof T]: ReturnType<T[P]> }, TResult, TContext>;
}

export class WorkflowStepBuilderParallel<TInput, TOutput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> implements IWorkflowStepBuilderParallel<TInput, TOutput, TResult, TContext> {
    private _steps: WorkflowStep<any, any, TContext>[];
    private _last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>;
    private _next: WorkflowStepBuilderBase<TOutput, any, TResult, TContext> | null = null;

    public constructor(steps: WorkflowStep<any, any, TContext>[],  last: WorkflowStepBuilderBase<any, any, TResult, TContext>, context: WorkflowContext<TContext> | null) {
        super(context);
        this._steps = steps;
        this._last = last;
        this._context = context;
    }

    public parallel<T extends (new () => WorkflowStep<any, any, TContext>)[] | []>(steps: T): IWorkflowStepBuilderParallel<TOutput, { -readonly [P in keyof T]: ReturnType<T[P]> }, TResult, TContext> {
        if (!(steps instanceof Array)) throw Error("Steps must be an array");

        let instances = (steps as Array<new () => WorkflowStep<TInput, any, TContext>>).map(step => new step());

        let parallel = new WorkflowStepBuilderParallel(instances, this, this._context);

        this._next = parallel;

        return parallel as any;
    }

    public error(step: new () => WorkflowStep<any, any, TContext>): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this._context);

        this._errorStep = stepBuiler;

        return this;
    }
    
    public timeout(milliseconds: number ): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        if (milliseconds < 1) throw Error("Timeout must be a postive integer");
        
        this._timeout = milliseconds;
        
        return this;
    }

    public if<TNext>(func: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TNext, TResult, TContext> {
        if (func == null) throw new Error("Conditional function cannot be null");
        
        let stepBuiler = new WorkflowStepBuilderCondition<TOutput, TNext, TResult, TContext>(this, this._context, func);

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

    public getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext> | null {
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
                let timeout: NodeJS.Timeout | null = null;
                let delay: NodeJS.Timeout | null = null;
                let hasTimeout: boolean = this._timeout != null;
                let hasExpired: boolean = false;

                if (hasTimeout) {
                    timeout = setTimeout(async () => {
                        hasExpired = true;

                        cts.cancel();

                        if (delay != null) clearTimeout(delay);

                        reject(timeoutMessage);
                    }, this._timeout ?? 0);
                }
    
                delay = setTimeout(async () => {
                    if (hasExpired) return reject(timeoutMessage);

                    if (this.hasNext()) {
                        try {
                            output = await Promise.all(this._steps.map(x => x.run(input, this._context)));
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
    
                        if (timeout != null) clearTimeout(timeout);

                        try {
                            output = await this.getNext()?.run(output, cts);
                        } catch (error) {
                            reject(error);
                        }

                        if (hasExpired) return reject(timeoutMessage);
    
                        resolve(output);
                    } else {
                        try {
                            output = await Promise.all(this._steps.map(x => x.run(input, this._context)));
                        } catch (error) {
                            reject(error);
                        }

                        if (hasExpired) return reject(timeoutMessage);
    
                        if (timeout != null) clearTimeout(timeout);
    
                        resolve(output);
                    }
                }, this._delayTime);
            } catch (error) {
                reject(error);
            }
        });
    }
}