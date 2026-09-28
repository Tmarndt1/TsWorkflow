import { WorkflowRunContext } from "./WorkflowRunContext";
import { execute } from "./functions/execute";
import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { WorkflowNextBuilder } from "./WorkflowNextBuilder";
import { WorkflowFinalBuilder } from "./WorkflowFinalBuilder";
import { WorkflowStepBuilder, WorkflowDefinition } from "./WorkflowStepBuilder";
import { WorkflowError } from "./WorkflowError";
import { IWorkflowNextExtBuilder } from "./interfaces/IWorkflowNextExtBuilder";
import { verifyNullOrThrow } from "./functions/verifyNullOrThrow";

export interface IWorkflowBuilder<TInput, TResult> {
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} factory The required WorfklowStep to start with.
     * @returns {WorkflowNextBuilder<TInput, TOutput, TResult>} A new Workflowbuilder instance to chain additional steps or conditions.
     */
    startWith<TOutput>(factory: () => IWorkflowStep<TInput, TOutput>): IWorkflowNextExtBuilder<TInput, TOutput, TResult>;
}

/**
 * WorkflowBuilder class that allows for the chaining of various workflow steps and conditions. 
 */
export class WorkflowBuilder<TInput, TResult> implements IWorkflowBuilder<TInput, TResult> {
    private _definition: WorkflowDefinition = { revision: 0 };
    private _final: WorkflowFinalBuilder<any, TResult> | undefined;
    private _cachedRevision = -1;
    private _builder: WorkflowStepBuilder<any, any, TResult> | null = null;

    
    /**
     * Starts the workflow with the WorkflowStep dependency.
     * @param {WorkflowStep} func The required WorfklowStep to start with.
     * @returns {WorkflowNextBuilder<TInput, TOutput, TResult>} A new Workflowbuilder instance to chain additional steps or conditions.
     */
    public startWith<TOutput>(func: () => IWorkflowStep<TInput, TOutput>): IWorkflowNextExtBuilder<TInput, TOutput, TResult> {
        verifyNullOrThrow(func);

        const definition: WorkflowDefinition = { revision: 0 };
        const builder = new WorkflowNextBuilder<TInput, TOutput, TResult>(func, definition);
        this._definition = definition;
        this._builder = builder;
        this._cachedRevision = -1;
        return builder;
    }

    /**
     * Runs the first WorkflowStep and passes the output into the next WorkflowStep.
     * @param {CancellationTokenSource} cts The CancellationTokenSource to cancel the workflow.
     * @returns {Promise<TResult>} A Promise of type TResult.
     */
    public async run(input: TInput, cts: CancellationTokenSource, context?: WorkflowRunContext): Promise<TResult> {
        const first = this._builder;
        if (!first) throw new Error("Workflow must define a starting step");
        // Re-scan only after the graph changes; retained, detached builder handles
        // must never replace the active chain's expiration.
        if (this._cachedRevision !== this._definition.revision) {
            this._final = undefined;
            for (let step: WorkflowStepBuilder<any, any, TResult> | undefined = first; step; step = step.getNext()) {
                if (step instanceof WorkflowFinalBuilder) this._final = step;
            }
            this._cachedRevision = this._definition.revision;
        }
        const expiration = this._final?.expiration() ?? 0;
        return execute(() => first.run(input, cts, context), cts, 0, expiration, WorkflowError.expired);
    }
}
