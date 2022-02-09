import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowErrorHandler } from "./WorkflowErrorHandler";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowStepBuilderFinal<TInput, TResult, TContext> {
    onError(option: WorkflowErrorHandler): IWorkflowStepBuilderFinal<TInput, TResult, TContext>;
    /**
     * Timeout for the entire workflow. If the timeout expires the workflow will be cancelled.
     * @param {number} milliseconds The number of milliseconds until the workflow expires.
     */
    expire(milliseconds: number): IWorkflowStepBuilderFinal<TInput, TResult, TContext>;
}

export class WorkflowStepBuilderFinal<TInput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TResult, TResult, TContext> implements IWorkflowStepBuilderFinal<TInput, TResult, TContext> {    
    private _expiration: number | null = null;
    private _onTimeoutStep: WorkflowStepBuilder<TInput, TResult, TResult, TContext>;

    public constructor(step: WorkflowStep<TInput, TResult, TContext>, last: WorkflowStepBuilder<any, any, TResult, TContext>, context: WorkflowContext<TContext>) {
        super(step, last, context);
        this._currentStep = step;
        this._lastStep = last;
        this._context = context;
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
    
    public onError(option: WorkflowErrorHandler): IWorkflowStepBuilderFinal<TInput, TResult, TContext> {
        this._workflowErrorHandler = option;
        
        return this;
    }

    public hasNext(): boolean {
        return this._nextStep != null;
    }

    public getNext(): WorkflowStepBuilderBase<TResult, any, TResult, TContext> {
        return null;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return new Promise((resolve, reject) => {
            if (cts?.token.isCancelled()) return reject("Workflow has been cancelled");

            setTimeout(async () => {
                try {
                    let result: TResult = await this._currentStep.run(input, this._context, cts);

                    resolve(result);
                } catch (error) {
                    reject(error);
                }
                
            }, this._delayTime);
        });
    }
}