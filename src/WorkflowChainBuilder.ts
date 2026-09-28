import { WorkflowRunContext } from "./WorkflowRunContext";
import { Timing } from "./types/Timing";
import { toTiming } from "./functions/toTiming";
import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { WorkflowStepBuilder, WorkflowDefinition } from "./WorkflowStepBuilder";
import { WorkflowConditionBuilder } from "./WorkflowConditionBuilder";
import { WorkflowFinalBuilder } from "./WorkflowFinalBuilder";
import { IWorkflowNextBuilder } from "./interfaces/IWorkflowNextBuilder";
import { IWorkflowNextExtBuilder } from "./interfaces/IWorkflowNextExtBuilder";
import { IWorkflowParallelBuilder } from "./interfaces/IWorkflowParallelBuilder";
import { IWorkflowFinalBuilder } from "./interfaces/IWorkflowFinalBuilder";
import { IWorkflowConditionBuilder } from "./interfaces/IWorkflowConditionBuilder";
import { ParallelType } from "./types/ParallelType";
import { verifyNullOrThrow } from "./functions/verifyNullOrThrow";

/** Shared fluent operations; interfaces restrict which operations callers can use. */
abstract class WorkflowChainBuilder<TInput, TOutput, TResult>
    extends WorkflowStepBuilder<TInput, TOutput, TResult>
    implements IWorkflowNextBuilder<TInput, TOutput, TResult> {
    public then<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowNextExtBuilder<TOutput, TNext, TResult> {
        return this.next(new WorkflowNextBuilder(factory, this._definition));
    }

    public parallel<T extends (() => IWorkflowStep<TOutput, any>)[] | []>(factories: T): IWorkflowParallelBuilder<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult> {
        return this.next(new WorkflowParallelBuilder<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult>(factories, this._definition));
    }

    public endWith(factory: () => IWorkflowStep<TOutput, TResult>): IWorkflowFinalBuilder<TOutput, TResult> {
        return this.next(new WorkflowFinalBuilder(factory, this._definition));
    }
}

abstract class WorkflowTimedChainBuilder<TInput, TOutput, TResult>
    extends WorkflowChainBuilder<TInput, TOutput, TResult>
    implements IWorkflowNextExtBuilder<TInput, TOutput, TResult> {
    public delay(duration: Timing): this {
        this._delay = toTiming(duration);
        return this;
    }

    public timeout(duration: Timing): this {
        this._timeout = toTiming(duration);
        return this;
    }

    public if(predicate: (output: TOutput) => boolean): IWorkflowConditionBuilder<TOutput, never, TResult> {
        return this.next(new WorkflowConditionBuilder<TOutput, never, TResult>(predicate, this._definition));
    }
}

export class WorkflowNextBuilder<TInput, TOutput, TResult> extends WorkflowTimedChainBuilder<TInput, TOutput, TResult> {
    public constructor(private readonly _factory: () => IWorkflowStep<TInput, TOutput>, definition?: WorkflowDefinition) {
        super(definition);
        verifyNullOrThrow(_factory);
    }

    public async run(input: TInput, cts: CancellationTokenSource, context?: WorkflowRunContext): Promise<TResult> {
        return this.executeStep(() => this.runFactory(this._factory, input, cts, context, "sequential"), cts, context);
    }
}

export class WorkflowParallelBuilder<TInput, TOutput, TResult>
    extends WorkflowTimedChainBuilder<TInput, TOutput, TResult>
    implements IWorkflowParallelBuilder<TInput, TOutput, TResult> {
    private readonly _factories: (() => IWorkflowStep<any, any>)[];

    public constructor(factories: (() => IWorkflowStep<any, any>)[], definition?: WorkflowDefinition) {
        super(definition);
        if (!Array.isArray(factories)) throw new Error("Parameter must be of type Array");
        factories.forEach(verifyNullOrThrow);
        this._factories = [...factories];
    }

    public async run(input: TInput, cts: CancellationTokenSource, context?: WorkflowRunContext): Promise<TResult> {
        return this.executeStep(
            () => Promise.all(this._factories.map(factory => this.runFactory(factory, input, cts, context, "parallel"))) as Promise<TOutput>,
            cts,
            context
        );
    }
}

export class WorkflowMoveNextBuilder<TInput, TOutput, TResult> extends WorkflowChainBuilder<TInput, TOutput, TResult> {
    public constructor(definition?: WorkflowDefinition) {
        super(definition);
    }

    public run(input: TInput, cts: CancellationTokenSource, context?: WorkflowRunContext): Promise<TResult> {
        return this._next?.run(input, cts, context) ?? Promise.reject(new Error("Internal error in workflow"));
    }
}
