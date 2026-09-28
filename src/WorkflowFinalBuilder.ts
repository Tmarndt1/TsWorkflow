import { Timing } from "./types/Timing";
import { toTiming } from "./functions/toTiming";
import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder, WorkflowDefinition } from "./WorkflowStepBuilder";
import { verifyNullOrThrow } from "./functions/verifyNullOrThrow";
import { IWorkflowFinalBuilder } from "./interfaces/IWorkflowFinalBuilder";

export class WorkflowFinalBuilder<TInput, TResult> extends WorkflowStepBuilder<TInput, TResult, TResult> implements IWorkflowFinalBuilder<TInput, TResult> {    
    private _expiration?: () => number;
    private _factory: () => IWorkflowStep<TInput, TResult>;

    public constructor(func: () => IWorkflowStep<TInput, TResult>, definition?: WorkflowDefinition) {
        super(definition);

        verifyNullOrThrow(func);

        this._factory = func;
    }

    public delay(duration: Timing): IWorkflowFinalBuilder<TInput, TResult> {
        this._delay = toTiming(duration);

        return this;
    }

    public expire(duration: Timing): IWorkflowFinalBuilder<TInput, TResult> {
        this._expiration = toTiming(duration);

        return this;
    }

    public expiration() {
        return this._expiration?.() ?? 0;
    }

    public async run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return this.executeStep(() => this._factory().run(input, cts.token), cts);
    }
}
