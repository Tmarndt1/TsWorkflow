import {
    runCancelledEventsExample,
    runCompletedEventsExample,
    runFailedEventsExample
} from "../../examples/WorkflowEvents";
import { WorkflowError, WorkflowErrorCode, WorkflowStepStartedEvent } from "../../index";

test('success example logs matching lifecycle events for every executed step', async () => {
    const log = jest.fn<void, [string, unknown?]>();
    await expect(runCompletedEventsExample(log)).resolves.toBe('Hello, ADA! (3 letters)');
    const started = log.mock.calls.filter(([message]) => message === 'Started')
        .map(([, event]) => event as WorkflowStepStartedEvent);
    const completed = log.mock.calls.filter(([message]) => message === 'Completed')
        .map(([, event]) => event as WorkflowStepStartedEvent);

    expect(started.map(event => event.kind)).toEqual(['sequential', 'conditional', 'parallel', 'parallel', 'final']);
    expect(new Set(started.map(event => event.runId)).size).toBe(1);
    expect(new Set(started.map(event => event.stepId)).size).toBe(5);
    expect(completed).toHaveLength(5);
    for (const event of started) {
        expect(completed.filter(done => done.runId === event.runId && done.stepId === event.stepId)).toHaveLength(1);
    }
    expect(log.mock.calls.some(([message]) => message === 'Failed')).toBe(false);
    expect(log).toHaveBeenLastCalledWith('Result', 'Hello, ADA! (3 letters)');
});

test('failure example logs the application error and handles the rejected run', async () => {
    const log = jest.fn<void, [string, unknown?]>();
    await expect(runFailedEventsExample(log)).resolves.toBeUndefined();
    const failed = log.mock.calls.filter(([message]) => message === 'Failed');
    expect(failed).toHaveLength(1);
    expect(failed[0]?.[1]).toMatchObject({
        kind: 'sequential', origin: 'step', error: new Error('Amount must be non-negative')
    });
    expect(log.mock.calls.filter(([message]) => message === 'Started')).toHaveLength(2);
    expect(log.mock.calls.filter(([message]) => message === 'Completed')).toHaveLength(1);
    expect(log).toHaveBeenLastCalledWith('Handled application error', 'Amount must be non-negative');
});

test('cancellation example reports failure of the active step without completing it or starting the final step', async () => {
    jest.useFakeTimers('modern');
    try {
        const log = jest.fn<void, [string, unknown?]>();
        const result = runCancelledEventsExample(log);
        expect(log.mock.calls.filter(([message]) => message === 'Started')).toHaveLength(1);
        expect(log).toHaveBeenLastCalledWith('Cancellation requested');
        expect(log.mock.calls.some(([message]) => message === 'Failed')).toBe(false);

        jest.advanceTimersByTime(25);
        await expect(result).resolves.toBeUndefined();

        const failed = log.mock.calls.filter(([message]) => message === 'Failed');
        expect(failed).toHaveLength(1);
        expect(failed[0]?.[1]).toMatchObject({
            origin: 'step', kind: 'sequential',
            error: expect.objectContaining({ code: WorkflowErrorCode.Cancelled })
        });
        expect(failed[0]?.[1]).toHaveProperty('error', expect.any(WorkflowError));
        expect(log.mock.calls.filter(([message]) => message === 'Started')).toHaveLength(1);
        expect(log.mock.calls.some(([message]) => message === 'Completed')).toBe(false);
        expect(log).toHaveBeenLastCalledWith('Handled cancellation', WorkflowErrorCode.Cancelled);
        expect(jest.getTimerCount()).toBe(0);
    } finally {
        jest.useRealTimers();
    }
});
