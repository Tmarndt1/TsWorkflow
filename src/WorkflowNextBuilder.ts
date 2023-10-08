import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep, WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder as WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowConditionBuilder } from "./WorkflowConditionBuilder";
import { WorkflowFinalBuilder } from "./WorkflowFinalBuilder";
import { WorkflowParallelBuilder } from "./WorkflowParallelBuilder";
import { Workflow } from "./Workflow";
import { WorkflowError } from "./WorkfowError";
import { IWorkflowConditionBuilder } from "./interfaces/IWorkflowConditionBuilder";
import { IWorkflowFinalBuilder } from "./interfaces/IWorkflowFinalBuilder";
import { IWorkflowNextExtBuilder } from "./interfaces/IWorkflowNextExtBuilder";
import { IWorkflowParallelBuilder } from "./interfaces/IWorkflowParallelBuilder";
import { ParallelType } from "./types/ParallelType";
import { verifyNullOrThrow } from "./functions/verifyNullOrThrow";

export class WorkflowNextBuilder<TInput, TOutput, TResult> extends WorkflowStepBuilder<TInput, TOutput, TResult> 
    implements IWorkflowNextExtBuilder<TInput, TOutput, TResult> {
    private _factory: () => IWorkflowStep<TInput, TOutput>;

    public constructor(func: () => IWorkflowStep<TInput, TOutput>, workflow: Workflow<any, TResult>) {
        super(workflow);

        verifyNullOrThrow(func);

        this._factory = func;
    }

    public parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(funcs: T): IWorkflowParallelBuilder<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult> {
        if (!(funcs instanceof Array)) throw Error("Parameter must be of type Array");

        return this.next(new WorkflowParallelBuilder(funcs, this._workflow));
    }

    public timeout(func: () => number): IWorkflowNextExtBuilder<TInput, TOutput, TResult> {     
        verifyNullOrThrow(func);
   
        this._timeout = func;
        
        return this;
    }

    public if(func: (output: TOutput) => boolean): IWorkflowConditionBuilder<TOutput, TOutput, TResult> {
        verifyNullOrThrow(func);

        this._next = new WorkflowConditionBuilder<TOutput, TOutput, TResult>(func, this._workflow);

        return this._next as any as IWorkflowConditionBuilder<TOutput, TOutput, TResult>;
    }

    public delay(func: () => number): IWorkflowNextExtBuilder<TInput, TOutput, TResult> {
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