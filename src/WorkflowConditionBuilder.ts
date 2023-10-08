import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { WorkflowMoveNextBuilder } from "./WorkflowMoveNextBuilder";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { Workflow } from "./Workflow";
import { WorkflowError } from "./WorkfowError";
import { IWorkflowConditionBuilder } from "./interfaces/IWorkflowConditionBuilder";
import { IWorkflowDoBuilder } from "./interfaces/IWorkflowDoBuilder";
import { IWorkflowElseBuilder } from "./interfaces/IWorkflowElseBuilder";
import { IWorkflowIfBuilder } from "./interfaces/IWorkflowIfBuilder";
import { IWorkflowNextBuilder } from "./interfaces/IWorkflowNextBuilder";
import { IWorkflowStoppedBuilder } from "./interfaces/IWorkflowStoppedBuilder";
import { verifyNullOrThrow } from "./functions/verifyNullOrThrow";

interface ICondition {
    delay: () => number;
    timeout: () => number;
    factory: () => IWorkflowStep<unknown, unknown>;
    condition: (args: any) => boolean;
    stop: boolean;
}

/**
 * WorkflowbuilderCondition class provides the conditional capabilities
 */
export class WorkflowConditionBuilder<TInput, TOutput, TResult> extends WorkflowStepBuilder<TInput, TOutput, TResult> 
    implements IWorkflowConditionBuilder<TInput, TOutput, TResult>, IWorkflowIfBuilder<TInput, TOutput, TResult>,
        IWorkflowElseBuilder<TInput, TOutput, TResult>, IWorkflowDoBuilder<TInput, TOutput, TResult>,
        IWorkflowStoppedBuilder<TInput, TOutput, TResult> {
            
    private _branches: ICondition[] = [];

    get branch(): ICondition {
        return this._branches[this._branches.length - 1];
    }

    public constructor(func: (input: TInput) => boolean, workflow: Workflow<any, TResult>) {
        super(workflow);

        verifyNullOrThrow(func);

        this._branches.push({
            delay: null,
            timeout: null,
            condition: func,
            factory: null,
            stop: false
        });
    }

    public stop(): IWorkflowStoppedBuilder<TInput, TOutput, TResult> {
        this.branch.stop = true;

        return this;
    }
    
    public timeout(func: () => number): any {
        verifyNullOrThrow(func);

        this.branch.timeout = func;

        return this;
    }
    
    public delay(func: () => number): any {
        verifyNullOrThrow(func);

        this.branch.delay = func;

        return this;
    }

    public do<TNext>(func: () => IWorkflowStep<TOutput, TNext>): IWorkflowIfBuilder<TInput, TOutput | TNext, TResult> {
        verifyNullOrThrow(func);

        this.branch.factory = func;

        return this;
    }

    public endIf(): IWorkflowNextBuilder<void, TOutput, TResult> {
        return this.next(new WorkflowMoveNextBuilder(this._workflow)) as any;
    }

    public elseIf(func: (input: TInput) => boolean): IWorkflowConditionBuilder<TInput, TOutput, TResult> {
        verifyNullOrThrow(func);
        
        this._branches.push({
            delay: null,
            timeout: null,
            condition: func,
            factory: null,
            stop: false
        });

        return this;
    }

    public else(): IWorkflowElseBuilder<TInput, TOutput, TResult> {        
        this._branches.push({
            delay: null,
            timeout: null,
            condition: () => true,
            factory: null,
            stop: false
        });

        return this;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return new Promise(async (resolve, reject) => {
            let branch = this._branches.find(x => x?.condition?.(input) === true);

            try {
                if (branch.stop) {
                    return reject(WorkflowError.stopped());
                }

                let delay: number | null = branch?.delay?.() ?? 0;
                let timeout: number = branch?.timeout?.() ?? 0;
                let expired: boolean = false;

                let delayTimeout: NodeJS.Timeout;
                let expireTimeout: NodeJS.Timeout;

                if (timeout > 0) {
                    expireTimeout = setTimeout(async () => {
                        expired = true;

                        cts.cancel();

                        if (delay != null) clearTimeout(delayTimeout);

                        reject(WorkflowError.timedOut(timeout));
                    }, timeout);
                }

                delayTimeout = setTimeout(async () => {
                    try {
                        clearInterval(expireTimeout);

                        if (expired) return reject(WorkflowError.timedOut(timeout));

                        if (this.hasNext()) {
                            resolve(
                                await this.getNext()?.run(await branch.factory()?.run(input, cts.token) as TOutput, cts) as TResult
                            )
                        } else {
                            resolve(
                                await branch.factory()?.run(input, cts.token) as TResult
                            )
                        }
                    } catch (error) {
                        reject(error);
                    }
                }, delay);                
            } catch (error) {
                return Promise.reject(error);
            }
        });
    }
}