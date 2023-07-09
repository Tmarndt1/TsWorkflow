import CancellationTokenSource from "../CancellationTokenSource";
import { IWorkflowStep, WorkflowStep } from "../WorkflowStep";
import { IWorkflowExecutorExt, WorkflowExecutor } from "./WorkflowExecutor";
import { WorkflowExecutorBase } from "./WorkflowExecutorBase";
import { IWorkflowExecutorCondition, WorkflowExecutorCondition } from "./WorkflowExecutorCondition";
import { IWorkflowExecutorEnd, WorkflowExecutorFinal } from "./WorkflowExecutorEnd";

type ReturnType<T> = T extends { new(): IWorkflowStep<unknown, infer TOutput> }
    ? TOutput : null;

export interface IWorkflowExecutorParallel<TInput, TOutput, TResult> {
    if<TNext>(func: (output: TOutput) => boolean): IWorkflowExecutorCondition<TOutput, TNext, TResult>;
    then<TNext>(factory: ((() => IWorkflowStep<TOutput, TNext>) | ((input: TOutput) => Promise<TNext>))): IWorkflowExecutorExt<TOutput, TNext, TResult>;
    endWith(factory: ((() => IWorkflowStep<TOutput, TResult>) | ((input: TOutput) => Promise<TResult>))): IWorkflowExecutorEnd<TOutput, TResult>;
    delay(milliseconds: number): IWorkflowExecutorParallel<TInput, TOutput, TResult>;
    timeout(milliseconds: number): IWorkflowExecutorParallel<TInput, TOutput, TResult>;
    parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(steps: T): IWorkflowExecutorParallel<TOutput, { -readonly [P in keyof T]: ReturnType<T[P]> }, TResult>;
}

export class WorkflowExecutorParallel<TInput, TOutput, TResult> extends WorkflowExecutorBase<TInput, TOutput, TResult> implements IWorkflowExecutorParallel<TInput, TOutput, TResult> {
    private _factories: (() => IWorkflowStep<any, any>)[];

    public constructor(factories: (() => IWorkflowStep<any, any>)[]) {
        super();

        this._factories = [...factories];
    }

    public parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(factories: T): IWorkflowExecutorParallel<TOutput, { -readonly [P in keyof T]: ReturnType<T[P]> }, TResult> {
        if (!(factories instanceof Array)) throw Error("Steps must be an array");

        return this.next(new WorkflowExecutorParallel(factories));
    }
    
    public timeout(milliseconds: number ): IWorkflowExecutorParallel<TInput, TOutput, TResult> {
        if (milliseconds < 1) throw Error("Timeout must be a postive integer");
        
        this._timeout = milliseconds;
        
        return this;
    }

    public if<TNext>(func: (output: TOutput) => boolean): IWorkflowExecutorCondition<TOutput, TNext, TResult> {
        if (func == null) throw new Error("Conditional function cannot be null");
        
        return this.next(new WorkflowExecutorCondition<TOutput, TNext, TResult>(func));
    }

    public delay(milliseconds: number): IWorkflowExecutorParallel<TInput, TOutput, TResult> {
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
                            output = await Promise.all(this._factories.map(factory => factory().run(input)));
                        } catch (error) {
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
                            output = await Promise.all(this._factories.map(factory => factory().run(input)));
                        } catch (error) {
                            reject(error);
                        }

                        if (hasExpired) return reject(timeoutMessage);
    
                        if (timeout != null) clearTimeout(timeout);
    
                        resolve(output);
                    }
                }, this._delay);
            } catch (error) {
                reject(error);
            }
        });
    }
}