import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderCondition, WorkflowStepBuilderCondition } from "./WorkflowStepBuilderCondition";
import { IWorkflowStepBuilderEnd, WorkflowStepBuilderFinal } from "./WorkflowStepBuilderEnd";

type ReturnType<T> = T extends { new(): WorkflowStep<unknown, infer TOutput> }
    ? TOutput : null;

export interface IWorkflowStepBuilderParallel<TInput, TOutput, TResult> {
    if<TNext>(func: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TNext, TResult>;
    then<TNext>(builder: () => WorkflowStep<TOutput, TNext>): IWorkflowStepBuilder<TOutput, TNext, TResult>;
    endWith(builder: () => WorkflowStep<TOutput, TResult>): IWorkflowStepBuilderEnd<TOutput, TResult>;
    delay(milliseconds: number): IWorkflowStepBuilderParallel<TInput, TOutput, TResult>;
    timeout(milliseconds: number): IWorkflowStepBuilderParallel<TInput, TOutput, TResult>;
    parallel<T extends (() => WorkflowStep<any, any>)[] | []>(steps: T): IWorkflowStepBuilderParallel<TOutput, { -readonly [P in keyof T]: ReturnType<T[P]> }, TResult>;
}

export class WorkflowStepBuilderParallel<TInput, TOutput, TResult> extends WorkflowStepBuilderBase<TInput, TOutput, TResult> implements IWorkflowStepBuilderParallel<TInput, TOutput, TResult> {
    private _factories: (() => WorkflowStep<any, any>)[];

    public constructor(factories: (() => WorkflowStep<any, any>)[]) {
        super();

        this._factories = factories;
    }

    public parallel<T extends (() => WorkflowStep<any, any>)[] | []>(factories: T): IWorkflowStepBuilderParallel<TOutput, { -readonly [P in keyof T]: ReturnType<T[P]> }, TResult> {
        if (!(factories instanceof Array)) throw Error("Steps must be an array");

        return this.next(new WorkflowStepBuilderParallel(factories));
    }
    
    public timeout(milliseconds: number ): IWorkflowStepBuilderParallel<TInput, TOutput, TResult> {
        if (milliseconds < 1) throw Error("Timeout must be a postive integer");
        
        this._timeout = milliseconds;
        
        return this;
    }

    public if<TNext>(func: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TNext, TResult> {
        if (func == null) throw new Error("Conditional function cannot be null");
        
        return this.next(new WorkflowStepBuilderCondition<TOutput, TNext, TResult>(this, func));
    }

    public delay(milliseconds: number): IWorkflowStepBuilderParallel<TInput, TOutput, TResult> {
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
                }, this._delayTime);
            } catch (error) {
                reject(error);
            }
        });
    }
}