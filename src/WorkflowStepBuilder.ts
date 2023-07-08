import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowFault } from "./WorkflowFault";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderCondition, WorkflowStepBuilderCondition } from "./WorkflowStepBuilderCondition";
import { IWorkflowStepBuilderEnd, WorkflowStepBuilderFinal } from "./WorkflowStepBuilderEnd";
import { IWorkflowStepBuilderParallel, WorkflowStepBuilderParallel } from "./WorkflowStepBuilderParallel";

export type ParallelType<T> = T extends () => WorkflowStep<unknown, infer TOutput> ? TOutput : null;

export interface IWorkflowStepBuilderFailure<TInput, TOutput, TResult> {
    continueWith<TNext>(factory: () => WorkflowStep<WorkflowFault, TNext>): IWorkflowStepBuilder<TInput, TOutput | TNext, TResult>; 
}

export interface IWorkflowStepBuilderBasic<TInput, TOutput, TResult> {
    then<TNext>(factory: () => WorkflowStep<unknown, TNext>): IWorkflowStepBuilder<TOutput, TNext, TResult>;
    endWith(step: () => WorkflowStep<TOutput, TResult>): IWorkflowStepBuilderEnd<TOutput, TResult>;
    parallel<T extends (() => WorkflowStep<any, any>)[] | []>(steps: T): IWorkflowStepBuilderParallel<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult>;
}

export interface IWorkflowStepBuilder<TInput, TOutput, TResult> extends IWorkflowStepBuilderBasic<TInput, TOutput, TResult> {
    if(func: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TOutput, TResult>;
    delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult>;
    timeoutAfter(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult>;
    onFailure(): IWorkflowStepBuilderFailure<TInput, TOutput, TResult>;
}

export class WorkflowStepBuilder<TInput, TOutput, TResult> extends WorkflowStepBuilderBase<TInput, TOutput, TResult> 
    implements IWorkflowStepBuilder<TInput, TOutput, TResult>, IWorkflowStepBuilderFailure<TInput, TOutput, TResult> {
    private _factory: () => WorkflowStep<TInput, TOutput>;
    private _continueFactory: () => WorkflowStep<WorkflowFault, any> = null;

    public constructor(factory: () => WorkflowStep<TInput, TOutput>) {
        super();

        this._factory = factory;
    }

    public parallel<T extends (() => WorkflowStep<any, any>)[] | []>(factories: T): IWorkflowStepBuilderParallel<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult> {
        if (!(factories instanceof Array)) throw Error("Factories must be an array");

        return this.next(new WorkflowStepBuilderParallel(factories));
    }

    public onFailure(): IWorkflowStepBuilderFailure<TInput, TOutput, TResult> {
        return this;
    }

    public continueWith<TNext>(factory: () => WorkflowStep<WorkflowFault, TNext>): IWorkflowStepBuilder<TInput, TOutput | TNext, TResult> {
        this._continueFactory = factory;

        return this;
    }
    
    public timeoutAfter(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult> {
        if (milliseconds < 1) throw Error("Timeout must be a postive integer");
        
        this._timeout = milliseconds;
        
        return this;
    }

    public if(expression: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TOutput, TResult> {
        if (expression == null) throw new Error("Expression function cannot be null");

        this._next = new WorkflowStepBuilderCondition<TOutput, TOutput, TResult>(this, expression);

        return this._next as any as IWorkflowStepBuilderCondition<TOutput, TOutput, TResult>;
    }

    public delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TResult> {
        this._delayTime = milliseconds;
        
        return this;
    }

    public then<TNext>(factory: () => WorkflowStep<TOutput, TNext>): IWorkflowStepBuilder<TOutput, TNext, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");

        return this.next(new WorkflowStepBuilder(factory));
    }

    public endWith(factory: () => WorkflowStep<TOutput, TResult>): IWorkflowStepBuilderEnd<TOutput, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");

        return this.next(new WorkflowStepBuilderFinal(factory));
    }
    
    public hasContinueWith(): boolean {
        return this._continueFactory != null;
    }

    public async run(input: TInput, cts: CancellationTokenSource): Promise<TOutput> {
        if (cts?.token.isCancelled()) {
            throw new Error("Workflow has been cancelled");
        }
    
        try {
            const output = await new Promise<TOutput>((resolve, reject) => {
                const timeout = this._timeout ?? 0;
                const delayTime = this._delayTime ?? 0;
    
                if (timeout > 0) {
                    setTimeout(() => {
                        cts.cancel();
                        reject(`Step timed out after ${timeout} ms`);
                    }, timeout);
                }
    
                setTimeout(async () => {
                    try {
                        let result = await this._factory().run(input);
            
                        if (this.hasNext()) {
                            result = await this.getNext()?.run(result, cts);
                        }
            
                        resolve(result);
                    } catch (error) {
                        if (this.hasContinueWith()) {
                            const fault = new WorkflowFault(error);
                        
                            const output = await this._continueFactory?.().run(fault);

                            resolve(output);
                        } else {
                            reject(error);
                        }
                    }
                }, delayTime);
            });

            return output;
        } catch (error) {
            throw error;
        }
    }
}