import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { WorkflowNextBuilder } from "./WorkflowNextBuilder";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowConditionBuilder } from "./WorkflowConditionBuilder";
import { WorkflowFinalBuilder } from "./WorkflowFinalBuilder";
import { Workflow } from "./Workflow";
import { WorkflowError } from "./WorkfowError";
import { IWorkflowConditionBuilder } from "./interfaces/IWorkflowConditionBuilder";
import { IWorkflowFinalBuilder } from "./interfaces/IWorkflowFinalBuilder";
import { IWorkflowNextExtBuilder } from "./interfaces/IWorkflowNextExtBuilder";
import { IWorkflowParallelBuilder } from "./interfaces/IWorkflowParallelBuilder";
import { ParallelType } from "./types/ParallelType";
import { verifyNullOrThrow } from "./functions/verifyNullOrThrow";

export class WorkflowParallelBuilder<TInput, TOutput, TResult> extends WorkflowStepBuilder<TInput, TOutput, TResult> implements IWorkflowParallelBuilder<TInput, TOutput, TResult> {
    private _factories: (() => IWorkflowStep<any, any>)[];

    public constructor(factories: (() => IWorkflowStep<any, any>)[], workflow: Workflow<any, TResult>) {
        super(workflow);

        this._factories = [...factories];
    }

    public parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(funcs: T): IWorkflowParallelBuilder<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult> {
        if (!(funcs instanceof Array)) throw Error("Parameter must be of type Array");

        return this.next(new WorkflowParallelBuilder(funcs, this._workflow));
    }
    
    public timeout(func: () => number): IWorkflowParallelBuilder<TInput, TOutput, TResult> {
        verifyNullOrThrow(func);
    
        this._timeout = func;
        
        return this;
    }

    public if<TNext>(func: (output: TOutput) => boolean): IWorkflowConditionBuilder<TOutput, TNext, TResult> {
        verifyNullOrThrow(func);
        
        return this.next(new WorkflowConditionBuilder<TOutput, TNext, TResult>(func, this._workflow));
    }

    public delay(func: () => number): IWorkflowParallelBuilder<TInput, TOutput, TResult> {
        verifyNullOrThrow(func);

        this._delay = func;
        
        return this;
    }

    public then<TNext>(func: () => IWorkflowStep<TOutput, TNext>): IWorkflowNextExtBuilder<TOutput, TNext, TResult> {
        verifyNullOrThrow(func);

        return this.next(new WorkflowNextBuilder(func, this._workflow));
    }

    public endWith(func: () => IWorkflowStep<TOutput, TResult>): IWorkflowFinalBuilder<TOutput, TResult> {
        verifyNullOrThrow(func);

        return this.next(new WorkflowFinalBuilder(func, this._workflow));
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