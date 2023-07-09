import CancellationTokenSource from "../CancellationTokenSource";
import { IWorkflowStep, WorkflowStep } from "../WorkflowStep";
import { WorkflowExecutorBase } from "./WorkflowExecutorBase";

export interface IWorkflowExecutorEnd<TInput, TResult> {
    /**
     * Timeout for the entire workflow. If the timeout expires the workflow will be cancelled.
     * @param {number} milliseconds The number of milliseconds until the workflow expires.
     */
    expire(milliseconds: number): IWorkflowExecutorEnd<TInput, TResult>;
    error(): IWorkflowExecutorEnd<TInput, void>;
}

export class WorkflowExecutorFinal<TInput, TResult> extends WorkflowExecutorBase<TInput, TResult, TResult> implements IWorkflowExecutorEnd<TInput, TResult> {    
    private _expiration: number;
    private _factory: () => IWorkflowStep<TInput, TResult>;

    public constructor(factory: () => IWorkflowStep<TInput, TResult>) {
        super();

        this._factory = factory;
    }

    public error(): IWorkflowExecutorEnd<TInput, void> {
        return this;
    }
    
    public expire(milliseconds: number): IWorkflowExecutorEnd<TInput, TResult> {
        if (milliseconds < 1) throw Error("Timeout must be a postive integer");

        this._expiration = milliseconds;

        return this;
    }

    public getExpiration(): number | null {
        return this._expiration;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return new Promise((resolve, reject) => {
            if (cts?.token.isCancelled()) return reject("Workflow has been cancelled");

            setTimeout(async () => {
                try {
                    resolve(await this._factory().run(input));
                } catch (error) {
                    return reject(error);
                }
                
            }, this._delay);
        });
    }
}