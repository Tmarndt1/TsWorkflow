import CancellationTokenSource from "../CancellationTokenSource";
import { IWorkflowStep, WorkflowStep } from "../WorkflowStep";
import { IWorkflowExecutorExt, WorkflowExecutor } from "./WorkflowExecutor";
import { WorkflowExecutorBase } from "./WorkflowExecutorBase";
import { IWorkflowExecutorCondition, WorkflowExecutorCondition } from "./WorkflowExecutorCondition";
import { IWorkflowExecutorEnd, WorkflowExecutorEnd } from "./WorkflowExecutorEnd";

type ReturnType<T> = T extends { new(): IWorkflowStep<unknown, infer TOutput> }
    ? TOutput : null;

export interface IWorkflowExecutorParallel<TInput, TOutput, TResult> {
    if<TNext>(func: (output: TOutput) => boolean): IWorkflowExecutorCondition<TOutput, TNext, TResult>;
    then<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowExecutorExt<TOutput, TNext, TResult>;
    endWith(factory: () => IWorkflowStep<TOutput, TResult>): IWorkflowExecutorEnd<TOutput, TResult>;
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

        return this.next(new WorkflowExecutorEnd(factory));
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return new Promise((resolve, reject) => {
            if (cts?.token.isCancelled()) return reject("Workflow has been cancelled");

            try {
                let timeout: number = this._timeout ?? 0;
                let delay: number = this._delay ?? 0;
                let expired: boolean = false;

                let delayTimeout: NodeJS.Timeout;
                let expireTimeout: NodeJS.Timeout;

                if (timeout > 0) {
                    expireTimeout = setTimeout(async () => {
                        expired = true;

                        cts.cancel();

                        clearTimeout(delayTimeout);

                        reject(`Step timed out after ${timeout} ms`);
                    }, this._timeout ?? 0);
                }
    
                delayTimeout = setTimeout(async () => {
                    if (expired) return reject(`Step timed out after ${timeout} ms`);

                    clearInterval(expireTimeout);

                    if (this.hasNext()) {
                        try {
                            let output: any[] = await Promise.all(this._factories.map(factory => factory().run(input, cts.token)));

                            resolve(await this.getNext()?.run(output as any, cts));
                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        if (expired) return reject(`Step timed out after ${timeout} ms`);

                        try {
                            resolve(await Promise.all(this._factories.map(factory => factory().run(input, cts.token))) as any);
                        } catch (error) {
                            reject(error);
                        }
                    }
                }, delay);
            } catch (error) {
                reject(error);
            }
        });
    }
}