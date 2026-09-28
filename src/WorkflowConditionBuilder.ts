import { WorkflowRunContext } from "./WorkflowRunContext";
import { Awaitable } from "./types/Awaitable";
import { Timing } from "./types/Timing";
import { toTiming } from "./functions/toTiming";
import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { WorkflowMoveNextBuilder } from "./WorkflowMoveNextBuilder";
import { WorkflowStepBuilder, WorkflowDefinition } from "./WorkflowStepBuilder";
import { WorkflowError } from "./WorkflowError";
import { IWorkflowConditionBuilder } from "./interfaces/IWorkflowConditionBuilder";
import { IWorkflowElseBuilder } from "./interfaces/IWorkflowElseBuilder";
import { IWorkflowIfBuilder } from "./interfaces/IWorkflowIfBuilder";
import { IWorkflowNextBuilder } from "./interfaces/IWorkflowNextBuilder";
import { IWorkflowStoppedBuilder } from "./interfaces/IWorkflowStoppedBuilder";
import { verifyNullOrThrow } from "./functions/verifyNullOrThrow";

interface ICondition {
    delay?: () => number;
    timeout?: () => number;
    factory?: () => IWorkflowStep<any, any>;
    condition: (args: any) => boolean;
    stop?: boolean;
}

/**
 * WorkflowbuilderCondition class provides the conditional capabilities
 */
export class WorkflowConditionBuilder<TInput, TOutput, TResult> extends WorkflowStepBuilder<TInput, TInput | TOutput, TResult>
    implements IWorkflowConditionBuilder<TInput, TOutput, TResult>, IWorkflowIfBuilder<TInput, TOutput, TResult>,
        IWorkflowStoppedBuilder<TInput, TOutput, TResult> {
            
    private _conditions: ICondition[] = [];

    get branch(): ICondition {
        return this._conditions[this._conditions.length - 1]!;
    }

    public constructor(func: (input: TInput) => boolean, definition?: WorkflowDefinition) {
        super(definition);

        this.addBranch(func);
    }

    private addBranch(condition: (input: TInput) => boolean): void {
        verifyNullOrThrow(condition);
        this._conditions.push({ condition });
    }

    public stop(): IWorkflowStoppedBuilder<TInput, TOutput, TResult> {
        this.branch.stop = true;

        return this;
    }
    
    public timeout(duration: Timing): this {
        this.branch.timeout = toTiming(duration);

        return this;
    }
    
    public delay(duration: Timing): this {
        this.branch.delay = toTiming(duration);

        return this;
    }

    public do<TNext>(func: () => IWorkflowStep<TInput, TNext>): IWorkflowIfBuilder<TInput, TOutput | TNext, TResult> {
        verifyNullOrThrow(func);

        this.branch.factory = func;

        return this;
    }

    public endIf(): IWorkflowNextBuilder<void, TInput | TOutput, TResult> {
        return this.next(new WorkflowMoveNextBuilder<TInput | TOutput, TInput | TOutput, TResult>(this._definition));
    }

    public elseIf(func: (input: TInput) => boolean): IWorkflowConditionBuilder<TInput, TOutput, TResult> {
        this.addBranch(func);

        return this;
    }

    public else(): IWorkflowElseBuilder<TInput, TOutput, TResult> {        
        this.addBranch(() => true);

        // The exhaustive view omits pass-through input; execution is shared.
        return this as unknown as IWorkflowElseBuilder<TInput, TOutput, TResult>;
    }

    public async run(input: TInput, cts: CancellationTokenSource, context?: WorkflowRunContext): Promise<TResult> {
        if (cts.token.isCancelled()) throw WorkflowError.cancelled();
        const condition = this._conditions.find(branch => branch.condition(input));
        if (condition?.stop) throw WorkflowError.stopped();

        return this.executeStep(
            () => condition?.factory
                ? this.runFactory(condition.factory, input, cts, context, "conditional") as Awaitable<TInput | TOutput>
                : input,
            cts,
            context,
            condition?.delay?.() ?? 0,
            condition?.timeout?.() ?? 0
        );
    }
}
