import CancellationTokenSource from "../../src/CancellationTokenSource";
import { Workflow, WorkflowStatus } from "../../src/Workflow";
import { IWorkflowBuilder } from "../../src/WorkflowBuilder";
import { IWorkflowFinalBuilder } from "../../src/interfaces/IWorkflowFinalBuilder";
import { WorkflowNextBuilder } from "../../src/WorkflowNextBuilder";
import { WorkflowError } from "../../src/WorkfowError";

function workflow(build: (builder: IWorkflowBuilder<number, number>) => IWorkflowFinalBuilder<any, number>) {
    return new class extends Workflow<number, number> {
        public build(builder: IWorkflowBuilder<number, number>) { return build(builder); }
    }();
}

const identity = () => ({ run: async (input: number) => input });
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };

beforeEach(() => jest.useFakeTimers('modern'));
afterEach(() => jest.useRealTimers());

test('unmatched conditions forward the original input without timers', async () => {
    const w = workflow(b => b.startWith(identity).if(() => false).stop().endIf().endWith(identity));
    await expect(w.run(7)).resolves.toBe(7);
    expect(jest.getTimerCount()).toBe(0);
});

test('predicate errors reject and mark the workflow faulted', async () => {
    const error = new Error('predicate failed');
    const w = workflow(b => b.startWith(identity).if(() => { throw error; }).stop().endIf().endWith(identity));
    await expect(w.run(1)).rejects.toBe(error);
    expect(w.status).toBe(WorkflowStatus.Faulted);
});

test.each(['sequential', 'conditional', 'parallel'])('%s timeout covers execution and prevents subsequent steps', async kind => {
    let complete!: (value: number) => void;
    const slow = () => ({ run: () => new Promise<number>(resolve => { complete = resolve; }) });
    const next = jest.fn(async (value: any) => value);
    const w = workflow(b => {
        const first = b.startWith(identity);
        if (kind === 'conditional') return first.if(() => true).do(slow).timeout(() => 10).endIf().endWith(() => ({ run: next }));
        if (kind === 'parallel') return first.parallel([slow]).timeout(() => 10).endWith(() => ({ run: next }));
        return first.then(slow).timeout(() => 10).endWith(() => ({ run: next }));
    });
    const cts = new CancellationTokenSource();
    const result = expect(w.run(1, cts)).rejects.toEqual(WorkflowError.timedOut(10));
    await flush();
    jest.advanceTimersByTime(10);
    await result;
    expect(cts.token.isCancelled()).toBe(true);
    complete(1);
    await flush();
    expect(next).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
});

test('timeouts include delays and clear pending delay timers', async () => {
    const run = jest.fn(async (n: number) => n);
    const w = workflow(b => b.startWith(() => ({ run })).delay(() => 100).timeout(() => 10).endWith(identity));
    const result = expect(w.run(1)).rejects.toEqual(WorkflowError.timedOut(10));
    jest.advanceTimersByTime(10);
    await result;
    expect(run).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
});

test('expiration covers the full workflow', async () => {
    const w = workflow(b => b.startWith(identity).endWith(identity).delay(() => 100).expire(() => 10));
    const result = expect(w.run(1)).rejects.toEqual(WorkflowError.expired(10));
    await flush();
    jest.advanceTimersByTime(10);
    await result;
    jest.advanceTimersByTime(100);
    await flush();
    expect(w.status).toBe(WorkflowStatus.Faulted);
    expect(jest.getTimerCount()).toBe(0);
});

test('failure clears expiration without subsequently cancelling the supplied token', async () => {
    const cts = new CancellationTokenSource();
    const error = new Error('step failed');
    const w = workflow(b => b.startWith(() => ({ run: async () => { throw error; } })).endWith(identity).expire(() => 10));
    await expect(w.run(1, cts)).rejects.toBe(error);
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(20);
    expect(cts.token.isCancelled()).toBe(false);
});

test('sequential steps receive the supplied cancellation token', async () => {
    const cts = new CancellationTokenSource();
    const run = jest.fn(async (n: number) => n);
    const w = workflow(b => b.startWith(() => ({ run })).endWith(identity));
    await w.run(1, cts);
    expect(run).toHaveBeenCalledWith(1, cts.token);
});

test('pre-cancelled runs reject without invoking steps', async () => {
    const cts = new CancellationTokenSource();
    cts.cancel();
    const run = jest.fn(async (n: number) => n);
    const w = workflow(b => b.startWith(() => ({ run })).endWith(identity));
    await expect(w.run(1, cts)).rejects.toEqual(WorkflowError.cancelled());
    expect(run).not.toHaveBeenCalled();
});

test('cancellation during a final delay prevents the final step', async () => {
    const cts = new CancellationTokenSource();
    const run = jest.fn(async (n: number) => n);
    const w = workflow(b => b.startWith(identity).endWith(() => ({ run })).delay(() => 10));
    const result = expect(w.run(1, cts)).rejects.toEqual(WorkflowError.cancelled());
    await flush();
    cts.cancel();
    jest.advanceTimersByTime(10);
    await result;
    expect(run).not.toHaveBeenCalled();
});

test('unlinked builders return their own step output', async () => {
    const builder = new WorkflowNextBuilder(identity, undefined);
    expect(builder.hasNext()).toBe(false);
    await expect(builder.run(42, new CancellationTokenSource())).resolves.toBe(42);
});

test('a completed step timeout does not apply to later steps', async () => {
    const w = workflow(b => b.startWith(identity).timeout(() => 10).endWith(identity).delay(() => 20));
    const result = expect(w.run(1)).resolves.toBe(1);
    await flush();
    jest.advanceTimersByTime(20);
    await result;
    expect(jest.getTimerCount()).toBe(0);
});
