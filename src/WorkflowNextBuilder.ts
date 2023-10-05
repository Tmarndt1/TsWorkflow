import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep, WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder as WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { IWorkflowConditionBuilder, WorkflowConditionBuilder } from "./WorkflowConditionBuilder";
import { IWorkflowFinalBuilder, WorkflowFinalBuilder } from "./WorkflowFinalBuilder";
import { IWorkflowParallelBuilder, WorkflowParallelBuilder } from "./WorkflowParallelBuilder";
import { Workflow } from "./Workflow";
import { WorkflowError } from "./WorkfowError";

export type ParallelType<T> = T extends () => WorkflowStep<unknown, infer TOutput> ? TOutput : null;

export interface IWorkflowNextBuilder<TInput, TOutput, TResult> {
    then<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowNextExtendedBuilder<TOutput, TNext, TResult>;
    endWith(factory: () => IWorkflowStep<TOutput, TResult>): IWorkflowFinalBuilder<TOutput, TResult>;
    parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(steps: T): IWorkflowParallelBuilder<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult>;
}

export interface IWorkflowNextExtendedBuilder<TInput, TOutput, TResult> extends IWorkflowNextBuilder<TInput, TOutput, TResult> {
    if(func: (output: TOutput) => boolean): IWorkflowConditionBuilder<TOutput, TOutput, TResult>;
    delay(func: () => number): IWorkflowNextExtendedBuilder<TInput, TOutput, TResult>;
    timeout(func: () => number): IWorkflowNextExtendedBuilder<TInput, TOutput, TResult>;
}

export class WorkflowNextBuilder<TInput, TOutput, TResult> extends WorkflowStepBuilder<TInput, TOutput, TResult> 
    implements IWorkflowNextExtendedBuilder<TInput, TOutput, TResult> {
    private _factory: () => IWorkflowStep<TInput, TOutput>;

    public constructor(factory: () => IWorkflowStep<TInput, TOutput>, workflow: Workflow<any, TResult>) {
        super(workflow);

        this._factory = factory;
    }

    public parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(factories: T): IWorkflowParallelBuilder<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult> {
        if (!(factories instanceof Array)) throw Error("Factories must be an array");

        return this.next(new WorkflowParallelBuilder(factories, this._workflow));
    }

    public timeout(func: () => number): IWorkflowNextExtendedBuilder<TInput, TOutput, TResult> {        
        this._timeout = func;
        
        return this;
    }

    public if(expression: (output: TOutput) => boolean): IWorkflowConditionBuilder<TOutput, TOutput, TResult> {
        if (expression == null) throw new Error("Expression function cannot be null");

        this._next = new WorkflowConditionBuilder<TOutput, TOutput, TResult>(expression, this._workflow);

        return this._next as any as IWorkflowConditionBuilder<TOutput, TOutput, TResult>;
    }

    public delay(func: () => number): IWorkflowNextExtendedBuilder<TInput, TOutput, TResult> {
        this._delay = func;
        
        return this;
    }

    public then<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowNextExtendedBuilder<TOutput, TNext, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");

        return this.next(new WorkflowNextBuilder(factory, this._workflow));
    }

    public endWith(factory: () => IWorkflowStep<TOutput, TResult>): IWorkflowFinalBuilder<TOutput, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");

        return this.next(new WorkflowFinalBuilder(factory, this._workflow));
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        if (cts?.token.isCancelled()) {
            throw new Error("Workflow has been cancelled");
        }
    
        try {
            return new Promise<TResult>((resolve, reject) => {
                let expired: boolean = false;
                const timeout = this._timeout?.() ?? 0;
                const delay = this._delay?.() ?? 0;

                let delayTimeout: NodeJS.Timeout;
                let expireTimeout: NodeJS.Timeout;

                if (timeout > 0) {
                    expireTimeout = setTimeout(() => {
                        expired = true;
                        
                        cts.cancel();

                        if (delay != null) clearTimeout(delayTimeout);

                        reject(WorkflowError.timedOut(timeout));
                    }, timeout);
                }
    
                delayTimeout = setTimeout(async () => {
                    try {
                        clearInterval(expireTimeout);
                        
                        if (expired) reject();

                        if (this.hasNext()) {
                            resolve(
                                await this.getNext()?.run(await this._factory().run(input), cts) as TResult
                            );
                        } else {
                            resolve(
                                await this._factory().run(input, cts.token) as TResult
                            );
                        }
                    } catch (error) {
                        reject(error);
                    }
                }, delay);
            });
        } catch (error) {
            throw error;
        }
    }
}