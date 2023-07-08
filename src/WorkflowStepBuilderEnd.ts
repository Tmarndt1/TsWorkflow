import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowStepBuilderEnd<TInput, TResult> {
    /**
     * Timeout for the entire workflow. If the timeout expires the workflow will be cancelled.
     * @param {number} milliseconds The number of milliseconds until the workflow expires.
     */
    expire(milliseconds: number): IWorkflowStepBuilderEnd<TInput, TResult>;
    onFailure(): IWorkflowStepBuilderEnd<TInput, void>;
}

export class WorkflowStepBuilderFinal<TInput, TResult> extends WorkflowStepBuilderBase<TInput, TResult, TResult> implements IWorkflowStepBuilderEnd<TInput, TResult> {    
    private _expiration: number | null = null;
    private _factory: () => WorkflowStep<TInput, TResult>;

    public constructor(factory: () => WorkflowStep<TInput, TResult>) {
        super();

        this._factory = factory;
    }

    public onFailure(): IWorkflowStepBuilderEnd<TInput, void> {
        return this;
    }
    
    public expire(milliseconds: number): IWorkflowStepBuilderEnd<TInput, TResult> {
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
                
            }, this._delayTime);
        });
    }
}