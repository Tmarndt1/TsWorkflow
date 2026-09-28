import { IWorkflowStep } from "./WorkflowStep";
import { WorkflowStepKind } from "./types/WorkflowRunOptions";
import { WorkflowRunContext } from "./WorkflowRunContext";
import { Awaitable } from "./types/Awaitable";
import CancellationTokenSource from "./CancellationTokenSource";
import { execute } from "./functions/execute";

export interface WorkflowDefinition {
    revision: number;
}

export abstract class WorkflowStepBuilder<TInput, TOutput, TResult> {
    protected _delay?: () => number;
    protected _timeout?: () => number;
    protected _next?: WorkflowStepBuilder<any, any, TResult>;
    protected constructor(protected readonly _definition: WorkflowDefinition = { revision: 0 }) {}

    protected next<T extends WorkflowStepBuilder<TOutput, any, TResult>>(builder: T) {
        this._next = builder;
        this._definition.revision++;

        return builder;
    }

    public getNext(): WorkflowStepBuilder<TOutput, any, TResult> | undefined {
        return this._next;
    }

    public hasNext(): boolean {
        return this._next != null;
    }

    protected async executeStep(
        action: () => Awaitable<TOutput>,
        cts: CancellationTokenSource,
        context?: WorkflowRunContext,
        delay = this._delay?.() ?? 0,
        timeout = this._timeout?.() ?? 0
    ): Promise<TResult> {
        const output = await execute(action, cts, delay, timeout);
        return this._next ? this._next.run(output, cts, context) : output as unknown as TResult;
    }

    protected runFactory<T>(
        factory: () => IWorkflowStep<TInput, T>,
        input: TInput,
        cts: CancellationTokenSource,
        context: WorkflowRunContext | undefined,
        kind: WorkflowStepKind
    ): Awaitable<T> {
        const action = () => factory().run(input, cts.token);
        return context ? context.observe(action, kind, cts) : action();
    }

    public abstract run(input: TInput, cts: CancellationTokenSource, context?: WorkflowRunContext): Promise<TResult>;
}
