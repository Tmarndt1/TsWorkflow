import { defineWorkflow, WorkflowErrorCode, WorkflowStatus } from "../../index";

const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };

test('step observers report sequential and parallel lifecycle events with correlation IDs', async () => {
    const started: any[] = [];
    const completed: any[] = [];
    const failed: any[] = [];
    const workflow = defineWorkflow<number, string>(builder => builder
        .startWith(() => ({ run: input => input + 1 }))
        .parallel([
            () => ({ run: input => String(input) }),
            () => ({ run: input => input * 2 })
        ])
        .endWith(() => ({ run: ([text, number]) => `${text}:${number}` })));

    await expect(workflow.run(2, { onStarted: event => { started.push(event); }, onCompleted: event => { completed.push(event); }, onFailed: event => { failed.push(event); } }))
        .resolves.toBe('3:6');
    expect(failed).toHaveLength(0);
    expect(started).toHaveLength(4);
    expect(completed).toHaveLength(4);
    expect(started.map(event => event.kind)).toEqual(['sequential', 'parallel', 'parallel', 'final']);
    expect(completed.map(event => event.kind)).toEqual(['sequential', 'parallel', 'parallel', 'final']);
    expect(new Set(started.map(event => event.runId)).size).toBe(1);
    expect(new Set(started.map(event => event.stepId)).size).toBe(4);
    for (const event of [...started, ...completed]) expect(Object.isFrozen(event)).toBe(true);
    for (const event of completed) expect(event.durationMs).toBeGreaterThanOrEqual(0);
});

test('conditional events include only the selected action, and skipped branches emit nothing', async () => {
    const events: any[] = [];
    const workflow = defineWorkflow<number, number>(builder => builder
        .startWith(() => ({ run: input => input }))
        .if(input => input > 0).do(() => ({ run: input => input + 1 }))
        .else().do(() => ({ run: input => input - 1 }))
        .endIf().endWith(() => ({ run: input => input })));
    await expect(workflow.run(1, { onStarted: event => { events.push(['start', event]); }, onCompleted: event => { events.push(['complete', event]); } }))
        .resolves.toBe(2);
    expect(events.map(([type, event]) => `${type}:${event.kind}`)).toEqual([
        'start:sequential', 'complete:sequential', 'start:conditional', 'complete:conditional', 'start:final', 'complete:final'
    ]);
});

test('step failures report onFailed and preserve application errors', async () => {
    const error = new Error('step failed');
    const failed: any[] = [];
    const workflow = defineWorkflow<number, number>(builder => builder
        .startWith(() => ({ run: () => { throw error; } }))
        .endWith(() => ({ run: input => input })));
    await expect(workflow.run(1, { onFailed: event => { failed.push(event); } })).rejects.toBe(error);
    expect(workflow.status).toBe(WorkflowStatus.Faulted);
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ kind: 'sequential', error, origin: 'step' });
});

test('run-level failures report active steps with origin run', async () => {
    jest.useFakeTimers();
    try {
        const failed: any[] = [];
        const workflow = defineWorkflow<number, number>(builder => builder
            .startWith(() => ({ run: () => new Promise<number>(() => {}) }))
            .endWith(() => ({ run: input => input }))
            .expire(10));
        const result = expect(workflow.run(1, { onFailed: event => { failed.push(event); } }))
            .rejects.toMatchObject({ code: WorkflowErrorCode.Expired });
        jest.advanceTimersByTime(10);
        await result;
        expect(failed).toHaveLength(1);
        expect(failed[0]).toMatchObject({ kind: 'sequential', origin: 'run' });
    } finally {
        jest.useRealTimers();
    }
});

test('observer errors and rejected observer promises do not alter workflow execution', async () => {
    const workflow = defineWorkflow<number, number>(builder => builder
        .startWith(() => ({ run: input => input + 1 })).endWith(() => ({ run: input => input })));
    const error = new Error('observer');
    await expect(workflow.run(1, {
        onStarted: () => { throw error; },
        onCompleted: () => Promise.reject(error),
        onFailed: () => { throw error; }
    })).resolves.toBe(2);
    await flush();
});

test('an external cancellation produces a failed active-step event and skips completion', async () => {
    jest.useFakeTimers();
    try {
        const failed: any[] = [];
        const source = new (require('../../src/CancellationTokenSource').default)();
        const workflow = defineWorkflow<number, number>(builder => builder
            .startWith(() => ({ run: input => input }))
            .delay(10).endWith(() => ({ run: input => input })));
        const result = expect(workflow.run(1, { cancellationTokenSource: source, onFailed: event => { failed.push(event); } }))
            .rejects.toMatchObject({ code: WorkflowErrorCode.Cancelled });
        source.cancel();
        jest.advanceTimersByTime(10);
        await result;
        expect(failed).toHaveLength(0);
    } finally {
        jest.useRealTimers();
    }
});

test('a cancelled step that has started emits a run-level failure event', async () => {
    jest.useFakeTimers();
    try {
        const failed: any[] = [];
        const source = new (require('../../src/CancellationTokenSource').default)();
        let finish!: (value: number) => void;
        const workflow = defineWorkflow<number, number>(builder => builder
            .startWith(() => ({ run: () => new Promise<number>(resolve => { finish = resolve; }) }))
            .endWith(() => ({ run: input => input }))
            .expire(10));
        const result = expect(workflow.run(1, { cancellationTokenSource: source, onFailed: event => { failed.push(event); } }))
            .rejects.toMatchObject({ code: WorkflowErrorCode.Expired });
        jest.advanceTimersByTime(10);
        await result;
        finish(1);
        await flush();
        expect(failed[0]).toMatchObject({ origin: 'run' });
    } finally {
        jest.useRealTimers();
    }
});

