import CancellationTokenSource from "../../src/CancellationTokenSource";
import { execute } from "../../src/functions/execute";
import { WorkflowError } from "../../src/WorkfowError";

beforeEach(() => jest.useFakeTimers('modern'));
afterEach(() => jest.useRealTimers());

test('default execution runs without timers', async () => {
    const timer = jest.spyOn(global, 'setTimeout');
    try {
        await expect(execute(async () => 3, new CancellationTokenSource())).resolves.toBe(3);
        expect(timer).not.toHaveBeenCalled();
    } finally {
        timer.mockRestore();
    }
});

test.each([0, -1])('nonpositive delay and timeout %i do not schedule timers', async duration => {
    await expect(execute(async () => 3, new CancellationTokenSource(), duration, duration)).resolves.toBe(3);
    expect(jest.getTimerCount()).toBe(0);
});

test('cancellation during execution is observed when the operation completes', async () => {
    const cts = new CancellationTokenSource();
    let finish!: (value: number) => void;
    const result = expect(execute(() => new Promise<number>(resolve => { finish = resolve; }), cts))
        .rejects.toEqual(WorkflowError.cancelled());
    cts.cancel();
    finish(3);
    await result;
});

test('an operation rejecting after its timeout is still handled', async () => {
    const cts = new CancellationTokenSource();
    let fail!: (error: Error) => void;
    const result = expect(execute(() => new Promise((_, reject) => { fail = reject; }), cts, 0, 10))
        .rejects.toEqual(WorkflowError.timedOut(10));
    jest.advanceTimersByTime(10);
    await result;
    fail(new Error('late failure'));
    await Promise.resolve();
    expect(jest.getTimerCount()).toBe(0);
});
