import CancellationTokenSource from "./CancellationTokenSource";
import { Awaitable } from "./types/Awaitable";
import { WorkflowRunOptions, WorkflowStepKind, WorkflowStepStartedEvent } from "./types/WorkflowRunOptions";

let nextRunId = 0;

interface ActiveStep {
    event: WorkflowStepStartedEvent;
    startedAt: number;
}

/** Execution-local observers; never store this on a reusable builder. */
export class WorkflowRunContext {
    private readonly _runId = `run-${++nextRunId}`;
    private _nextStepId = 0;
    private _closed = false;
    private readonly _active = new Map<string, ActiveStep>();
    private readonly _hooks: WorkflowRunOptions;

    public constructor(options: WorkflowRunOptions) {
        this._hooks = {
            onStarted: options.onStarted,
            onCompleted: options.onCompleted,
            onFailed: options.onFailed
        };
    }

    private notify<T>(hook: ((event: T) => Awaitable<void>) | undefined, event: T): void {
        if (!hook) return;
        try {
            const result = hook(Object.freeze(event));
            if (result != null) void Promise.resolve(result).catch(() => {});
        } catch {
            // Observers must not change workflow control flow or replace application errors.
        }
    }

    public async observe<T>(action: () => Awaitable<T>, kind: WorkflowStepKind, cts: CancellationTokenSource): Promise<T> {
        cts.token.throwIfCancelled();
        const event: WorkflowStepStartedEvent = {
            runId: this._runId,
            stepId: `step-${++this._nextStepId}`,
            kind,
            timestamp: Date.now()
        };
        const step = { event, startedAt: performance.now() };
        this._active.set(event.stepId, step);
        this.notify(this._hooks.onStarted, event);
        try {
            cts.token.throwIfCancelled();
            const output = await action();
            cts.token.throwIfCancelled();
            if (!this._closed) {
                this._active.delete(event.stepId);
                this.notify(this._hooks.onCompleted, this.finished(step));
            }
            return output;
        } catch (error) {
            if (!this._closed) {
                this._active.delete(event.stepId);
                this.notify(this._hooks.onFailed, { ...this.finished(step), error, origin: "step" });
            }
            throw error;
        }
    }

    private finished(step: ActiveStep) {
        return { ...step.event, timestamp: Date.now(), durationMs: performance.now() - step.startedAt };
    }

    public fail(error: unknown): void {
        this._closed = true;
        for (const step of this._active.values()) {
            this.notify(this._hooks.onFailed, { ...this.finished(step), error, origin: "run" });
        }
        this._active.clear();
    }

    public close(): void {
        this._closed = true;
        this._active.clear();
    }
}
