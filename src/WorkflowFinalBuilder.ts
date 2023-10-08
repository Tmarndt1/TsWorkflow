import CancellationTokenSource from "./CancellationTokenSource";
import { Workflow } from "./Workflow";
import { IWorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowError } from "./WorkfowError";
import { verifyNullOrThrow } from "./functions/verifyNullOrThrow";
import { IWorkflowFinalBuilder } from "./interfaces/IWorkflowFinalBuilder";

export class WorkflowFinalBuilder<TInput, TResult> extends WorkflowStepBuilder<TInput, TResult, TResult> implements IWorkflowFinalBuilder<TInput, TResult> {    
    private _expiration: () => number;
    private _factory: () => IWorkflowStep<TInput, TResult>;

    public constructor(func: () => IWorkflowStep<TInput, TResult>, workflow: Workflow<any, TResult>) {
        super(workflow);

        verifyNullOrThrow(func);

        this._factory = func;
    }

    public delay(func: () => number): IWorkflowFinalBuilder<TInput, TResult> {
        verifyNullOrThrow(func);

        this._delay = func;

        return this;
    }

    public expire(func: () => number): IWorkflowFinalBuilder<TInput, TResult> {
        verifyNullOrThrow(func);

        this._expiration = func;

        return this;
    }

    public expiration() {
        return this._expiration?.() ?? 0;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return new Promise((resolve, reject) => {
            if (cts?.token.isCancelled()) return reject(WorkflowError.cancelled());

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