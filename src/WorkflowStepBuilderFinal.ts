import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowStepBuilderFinal<TInput, TResult, TContext> {
    /**
     * Timeout for the entire workflow. If the timeout expires the workflow will be cancelled.
     * @param {number} milliseconds The number of milliseconds until the workflow expires.
     */
    expire(milliseconds: number): IWorkflowStepBuilderFinal<TInput, TResult, TContext>;
    failed(step: { new(): WorkflowStep<any, any, TContext> }): IWorkflowStepBuilderFinal<TInput, void, TContext>;
}

export class WorkflowStepBuilderFinal<TInput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TResult, TResult, TContext> implements IWorkflowStepBuilderFinal<TInput, TResult, TContext> {    
    private _expiration: number | null = null;
    private _onTimeoutStep: WorkflowStepBuilder<TInput, TResult, TResult, TContext> | null = null;
    private _step: WorkflowStep<TInput, TResult, TContext>;
    private _last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>;

    public constructor(step: WorkflowStep<TInput, TResult, TContext>, last: WorkflowStepBuilderBase<any, any, TResult, TContext>, context: WorkflowContext<TContext> | null) 
    {
        super(context);
        this._step = step;
        this._last = last;
        this._context = context;
    }

    public failed(step: new () => WorkflowStep<any, any, TContext>): IWorkflowStepBuilderFinal<TInput, void, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this._context);

        this._errorStep = stepBuiler;

        return this;
    }
    
    public expire(milliseconds: number): IWorkflowStepBuilderFinal<TInput, TResult, TContext> {
        if (milliseconds < 1) throw Error("Timeout must be a postive integer");

        this._expiration = milliseconds;

        return this;
    }

    public getExpiration(): number | null {
        return this._expiration;
    }

    public getTimeout(): number | null {
        return this._timeout;
    }

    public hasNext(): boolean {
        return false;
    }

    public getNext(): WorkflowStepBuilderBase<TResult, any, TResult, TContext> | null {
        return null;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return new Promise((resolve, reject) => {
            if (cts?.token.isCancelled()) return reject("Workflow has been cancelled");

            setTimeout(async () => {
                try {
                    resolve(await this._step.run(input, this._context));
                } catch (error) {
                    if (this._errorStep != null) {
                        try {
                            await this._errorStep.run(input, cts);
                        } catch (error) {
                            return reject(error);
                        }
                    }

                    return reject(error);
                }
                
            }, this._delayTime);
        });
    }
}