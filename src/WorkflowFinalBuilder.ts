import CancellationTokenSource from "./CancellationTokenSource";
import { Workflow } from "./Workflow";
import { IWorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";

export interface IWorkflowFinalBuilder<TInput, TResult> {
    /**
     * Timeout for the entire workflow. If the timeout expires the workflow will be cancelled.
     * @param {number} milliseconds The number of milliseconds until the workflow expires.
     */
    expire(func: () => number): IWorkflowFinalBuilder<TInput, TResult>;

    delay(func: () => number): IWorkflowFinalBuilder<TInput, TResult>;
}

export class WorkflowFinalBuilder<TInput, TResult> extends WorkflowStepBuilder<TInput, TResult, TResult> implements IWorkflowFinalBuilder<TInput, TResult> {    
    private _expiration: () => number;
    private _factory: () => IWorkflowStep<TInput, TResult>;

    public constructor(factory: () => IWorkflowStep<TInput, TResult>, workflow: Workflow<any, TResult>) {
        super(workflow);

        this._factory = factory;
    }

    public delay(func: () => number): IWorkflowFinalBuilder<TInput, TResult> {
        this._delay = func;

        return this;
    }

    public expire(func: () => number): IWorkflowFinalBuilder<TInput, TResult> {
        this._expiration = func;

        return this;
    }

    public expiration() {
        return this._expiration?.() ?? 0;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return new Promise((resolve, reject) => {
            if (cts?.token.isCancelled()) return reject("Workflow has been cancelled");

            setTimeout(async () => {
                try {
                    resolve(await this._factory().run(input, cts.token));
                } catch (error) {
                    return reject(error);
                }
                
            }, this._delay?.() ?? 0);
        });
    }
}