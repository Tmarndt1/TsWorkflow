import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { IWorkflowNextExtendedBuilder, ParallelType, WorkflowNextBuilder } from "./WorkflowNextBuilder";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { IWorkflowConditionBuilder, WorkflowConditionBuilder } from "./WorkflowConditionBuilder";
import { IWorkflowFinalBuilder, WorkflowFinalBuilder } from "./WorkflowFinalBuilder";
import { Workflow } from "./Workflow";
import { WorkflowError } from "./WorkfowError";

// type ReturnType<T> = T extends { new(): IWorkflowStep<unknown, infer TOutput> }
//     ? TOutput : null;

export interface IWorkflowParallelBuilder<TInput, TOutput, TResult> {
    if(func: (output: TOutput) => boolean): IWorkflowConditionBuilder<TOutput, TOutput, TResult>;
    then<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowNextExtendedBuilder<TOutput, TNext, TResult>;
    endWith(factory: () => IWorkflowStep<TOutput, TResult>): IWorkflowFinalBuilder<TOutput, TResult>;
    delay(func: () => number): IWorkflowParallelBuilder<TInput, TOutput, TResult>;
    timeout(func: () => number): IWorkflowParallelBuilder<TInput, TOutput, TResult>;
    parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(steps: T): IWorkflowParallelBuilder<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult>;
}

export class WorkflowParallelBuilder<TInput, TOutput, TResult> extends WorkflowStepBuilder<TInput, TOutput, TResult> implements IWorkflowParallelBuilder<TInput, TOutput, TResult> {
    private _factories: (() => IWorkflowStep<any, any>)[];

    public constructor(factories: (() => IWorkflowStep<any, any>)[], workflow: Workflow<any, TResult>) {
        super(workflow);

        this._factories = [...factories];
    }

    public parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(factories: T): IWorkflowParallelBuilder<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult> {
        if (!(factories instanceof Array)) throw Error("Steps must be an array");

        return this.next(new WorkflowParallelBuilder(factories, this._workflow));
    }
    
    public timeout(func: () => number): IWorkflowParallelBuilder<TInput, TOutput, TResult> {        
        this._timeout = func;
        
        return this;
    }

    public if<TNext>(func: (output: TOutput) => boolean): IWorkflowConditionBuilder<TOutput, TNext, TResult> {
        if (func == null) throw new Error("Conditional function cannot be null");
        
        return this.next(new WorkflowConditionBuilder<TOutput, TNext, TResult>(func, this._workflow));
    }

    public delay(func: () => number): IWorkflowParallelBuilder<TInput, TOutput, TResult> {
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
        return new Promise((resolve, reject) => {
            if (cts?.token.isCancelled()) return reject(WorkflowError.cancelled());

            try {
                let timeout: number = this._timeout?.() ?? 0;
                let delay: number = this._delay?.() ?? 0;
                let expired: boolean = false;

                let delayTimeout: NodeJS.Timeout;
                let expireTimeout: NodeJS.Timeout;

                if (timeout > 0) {
                    expireTimeout = setTimeout(async () => {
                        expired = true;

                        cts.cancel();

                        clearTimeout(delayTimeout);

                        reject(WorkflowError.timedOut(timeout));
                    }, timeout);
                }
    
                delayTimeout = setTimeout(async () => {
                    if (expired) return reject(WorkflowError.timedOut(timeout));

                    clearInterval(expireTimeout);

                    if (this.hasNext()) {
                        try {
                            let output: any[] = await Promise.all(this._factories.map(factory => factory().run(input, cts.token)));

                            resolve(await this.getNext()?.run(output as any, cts));
                        } catch (error) {
                            reject(error);
                        }
                    } else {
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