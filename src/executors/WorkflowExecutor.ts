import CancellationTokenSource from "../CancellationTokenSource";
import { IWorkflowStep, WorkflowStep } from "../WorkflowStep";
import { WorkflowExecutorBase } from "./WorkflowExecutorBase";
import { IWorkflowExecutorCondition, WorkflowExecutorCondition } from "./WorkflowExecutorCondition";
import { IWorkflowExecutorEnd, WorkflowExecutorFinal } from "./WorkflowExecutorEnd";
import { IWorkflowExecutorParallel, WorkflowExecutorParallel } from "./WorkflowExecutorParallel";

export type ParallelType<T> = T extends () => WorkflowStep<unknown, infer TOutput> ? TOutput : null;


export interface IWorkflowExecutor<TInput, TOutput, TResult> {
    then<TNext>(factory: () => IWorkflowStep<unknown, TNext>): IWorkflowExecutorExt<TOutput, TNext, TResult>;
    endWith(factory: () => WorkflowStep<TOutput, TResult>): IWorkflowExecutorEnd<TOutput, TResult>;
    parallel<T extends (() => WorkflowStep<any, any>)[] | []>(steps: T): IWorkflowExecutorParallel<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult>;
}

export interface IWorkflowExecutorExt<TInput, TOutput, TResult> extends IWorkflowExecutor<TInput, TOutput, TResult> {
    if(func: (output: TOutput) => boolean): IWorkflowExecutorCondition<TOutput, TOutput, TResult>;
    delay(milliseconds: number): IWorkflowExecutorExt<TInput, TOutput, TResult>;
    timeout(milliseconds: number): IWorkflowExecutorExt<TInput, TOutput, TResult>;
    // error(factory: () => WorkflowStep<Error, TResult>): IWorkflowExecutorExt<TOutput, TOutput, TResult>;
}

export class WorkflowExecutor<TInput, TOutput, TResult> extends WorkflowExecutorBase<TInput, TOutput, TResult> 
    implements IWorkflowExecutorExt<TInput, TOutput, TResult> {
    private _factory: () => IWorkflowStep<TInput, TOutput>;
    private _errorFactory: () => IWorkflowStep<Error, any>;

    public constructor(factory: () => IWorkflowStep<TInput, TOutput>) {
        super();

        this._factory = factory;
    }
    public error(factory: () => IWorkflowStep<Error, TResult>): IWorkflowExecutorExt<TOutput, TOutput, TResult> {
        this._errorFactory = factory;

        return this;
    }

    public parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(factories: T): IWorkflowExecutorParallel<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult> {
        if (!(factories instanceof Array)) throw Error("Factories must be an array");

        return this.next(new WorkflowExecutorParallel(factories));
    }

    public timeout(milliseconds: number): IWorkflowExecutorExt<TInput, TOutput, TResult> {
        if (milliseconds < 1) throw Error("Timeout must be a postive integer");
        
        this._timeout = milliseconds;
        
        return this;
    }

    public if(expression: (output: TOutput) => boolean): IWorkflowExecutorCondition<TOutput, TOutput, TResult> {
        if (expression == null) throw new Error("Expression function cannot be null");

        this._next = new WorkflowExecutorCondition<TOutput, TOutput, TResult>(expression);

        return this._next as any as IWorkflowExecutorCondition<TOutput, TOutput, TResult>;
    }

    public delay(milliseconds: number): IWorkflowExecutorExt<TInput, TOutput, TResult> {
        this._delay = milliseconds;
        
        return this;
    }

    public then<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowExecutorExt<TOutput, TNext, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");

        return this.next(new WorkflowExecutor(factory));
    }

    public endWith(factory: () => IWorkflowStep<TOutput, TResult>): IWorkflowExecutorEnd<TOutput, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");

        return this.next(new WorkflowExecutorFinal(factory));
    }

    public hasCatch(): boolean {
        return this._errorFactory != null;
    }

    public async run(input: TInput, cts: CancellationTokenSource): Promise<TOutput> {
        if (cts?.token.isCancelled()) {
            throw new Error("Workflow has been cancelled");
        }
    
        try {
            const output = await new Promise<TOutput>((resolve, reject) => {
                const timeout = this._timeout ?? 0;
                const delayTime = this._delay ?? 0;
    
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
                        if (this.hasCatch()) {                        
                            const output = await this._errorFactory?.().run(error);

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