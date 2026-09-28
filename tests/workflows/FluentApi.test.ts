import CancellationTokenSource from "../../src/CancellationTokenSource";
import { Workflow, WorkflowStatus } from "../../src/Workflow";
import { WorkflowBuilder, IWorkflowBuilder } from "../../src/WorkflowBuilder";
import { WorkflowConditionBuilder } from "../../src/WorkflowConditionBuilder";
import { WorkflowNextBuilder } from "../../src/WorkflowNextBuilder";
import { WorkflowParallelBuilder } from "../../src/WorkflowParallelBuilder";
import { WorkflowMoveNextBuilder } from "../../src/WorkflowMoveNextBuilder";
import { IWorkflowFinalBuilder } from "../../src/interfaces/IWorkflowFinalBuilder";
import { WorkflowError } from "../../src/WorkfowError";

const identity = () => ({ run: async (n: number) => n });
const flush = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };
function workflow(build: (b: IWorkflowBuilder<number, any>) => IWorkflowFinalBuilder<any, any>) {
    return new class extends Workflow<number, any> {
        public build(b: IWorkflowBuilder<number, any>) { return build(b); }
    }();
}

beforeEach(() => jest.useFakeTimers('modern'));
afterEach(() => jest.useRealTimers());

test.each([1, 2, 3])('only the first matching branch runs for input %i', async input => {
    const first = jest.fn(async (n: number) => n + 10);
    const second = jest.fn(async (n: number) => n + 20);
    const fallback = jest.fn(async (n: number) => n + 30);
    const w = workflow(b => b.startWith(identity)
        .if(n => n === 1).do(() => ({ run: first }))
        .elseIf(n => n <= 2).do(() => ({ run: second }))
        .else().do(() => ({ run: fallback })).endIf().endWith(identity));
    await expect(w.run(input)).resolves.toBe(input * 11);
    expect([first, second, fallback].map(fn => fn.mock.calls.length)).toEqual(
        [1, 2, 3].map(n => n === input ? 1 : 0));
});

test.each(['if', 'elseIf', 'else'])('%s stop rejects with stopped status and skips following steps', async kind => {
    const next = jest.fn(async (n: number) => n);
    const w = workflow(b => b.startWith(identity).if(() => kind === 'if').stop()
        .elseIf(() => kind === 'elseIf').stop().else().stop()
        .endIf().endWith(() => ({ run: next })));
    await expect(w.run(1)).rejects.toEqual(WorkflowError.stopped());
    expect(w.status).toBe(WorkflowStatus.Stopped);
    expect(next).not.toHaveBeenCalled();
});

test('parallel branches start together, preserve tuple order, and receive the same input and token', async () => {
    let finishFirst!: (value: string) => void;
    let finishSecond!: (value: boolean) => void;
    const first = jest.fn(() => new Promise<string>(resolve => { finishFirst = resolve; }));
    const second = jest.fn(() => new Promise<boolean>(resolve => { finishSecond = resolve; }));
    const cts = new CancellationTokenSource();
    const w = workflow(b => b.startWith(identity).parallel([() => ({ run: first }), () => ({ run: second })])
        .endWith(() => ({ run: async tuple => tuple })));
    const result = w.run(8, cts);
    await flush();
    expect(first).toHaveBeenCalledWith(8, cts.token);
    expect(second).toHaveBeenCalledWith(8, cts.token);
    finishSecond(true);
    finishFirst('first');
    await expect(result).resolves.toEqual(['first', true]);
});

test('parallel chains, post-condition chains, and empty parallel groups work', async () => {
    const w = workflow(b => b.startWith(identity).parallel([identity])
        .parallel([() => ({ run: async (values: [number]) => values[0] + 1 })])
        .if(values => values[0] === 3).do(() => ({ run: async values => values }))
        .endIf().parallel([]).then(() => ({ run: async values => values.length }))
        .endWith(identity));
    await expect(w.run(2)).resolves.toBe(0);
});

test.each(['sequential', 'conditional', 'parallel', 'final'])('%s respects delay and passes the token', async kind => {
    const cts = new CancellationTokenSource();
    const run = jest.fn(async (n: number) => n + 1);
    const w = workflow(b => {
        const first = b.startWith(identity);
        if (kind === 'conditional') return first.if(() => true).do(() => ({ run })).delay(() => 10).endIf().endWith(identity);
        if (kind === 'parallel') return first.parallel([() => ({ run })]).delay(() => 10).then(() => ({ run: async x => x[0] })).endWith(identity);
        if (kind === 'final') return first.endWith(() => ({ run })).delay(() => 10);
        return first.then(() => ({ run })).delay(() => 10).endWith(identity);
    });
    const result = w.run(2, cts);
    await flush();
    jest.advanceTimersByTime(9);
    await flush();
    expect(run).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await expect(result).resolves.toBe(3);
    expect(run).toHaveBeenCalledWith(2, cts.token);
    expect(jest.getTimerCount()).toBe(0);
});

test.each(['factory', 'sync', 'async'])('%s errors propagate from every step kind', async failure => {
    const error = new Error(failure);
    const bad = () => {
        if (failure === 'factory') throw error;
        return { run: () => { if (failure === 'sync') throw error; return Promise.reject(error); } };
    };
    for (const kind of ['sequential', 'conditional', 'parallel', 'final']) {
        const w = workflow(b => {
            const first = b.startWith(identity);
            if (kind === 'conditional') return first.if(() => true).do(bad).endIf().endWith(identity);
            if (kind === 'parallel') return first.parallel([bad]).endWith(() => ({ run: async x => x }));
            if (kind === 'final') return first.endWith(bad);
            return first.then(bad).endWith(identity);
        });
        await expect(w.run(1)).rejects.toBe(error);
        expect(w.status).toBe(WorkflowStatus.Faulted);
        expect(jest.getTimerCount()).toBe(0);
    }
});

test('else branch timing can be configured', async () => {
    const w = workflow(b => b.startWith(identity).if(() => false).stop()
        .else().do(identity).delay(() => 20).timeout(() => 10).endIf().endWith(identity));
    const result = expect(w.run(1)).rejects.toEqual(WorkflowError.timedOut(10));
    await flush();
    jest.advanceTimersByTime(10);
    await result;
    expect(jest.getTimerCount()).toBe(0);
});

test('expiration and factories are reevaluated on every run', async () => {
    let expiration = 0;
    const factory = jest.fn(identity);
    const limit = jest.fn(() => expiration);
    const w = workflow(b => b.startWith(factory).endWith(identity).delay(() => 10).expire(limit));
    const first = w.run(1);
    await flush();
    jest.advanceTimersByTime(10);
    await expect(first).resolves.toBe(1);
    expiration = 5;
    const second = expect(w.run(2)).rejects.toEqual(WorkflowError.expired(5));
    await flush();
    jest.advanceTimersByTime(5);
    await second;
    jest.advanceTimersByTime(10);
    await flush();
    expect(limit).toHaveBeenCalledTimes(2);
    expect(factory).toHaveBeenCalledTimes(2);
});

test('replacing the starting chain does not retain expiration from the old chain', async () => {
    const b = new WorkflowBuilder<number, number>();
    const old = b.startWith(identity);
    old.endWith(identity).expire(() => 1);
    b.startWith(identity).endWith(identity).delay(() => 10);
    old.endWith(identity).expire(() => 2);
    const result = b.run(3, new CancellationTokenSource());
    await flush();
    jest.advanceTimersByTime(10);
    await expect(result).resolves.toBe(3);
});

test('replacing a suffix clears its old expiration', async () => {
    const b = new WorkflowBuilder<number, number>();
    const first = b.startWith(identity);
    first.endWith(identity).expire(() => 1);
    first.then(identity).endWith(identity).delay(() => 10);
    const result = b.run(3, new CancellationTokenSource());
    await flush();
    jest.advanceTimersByTime(10);
    await expect(result).resolves.toBe(3);
});

test('detached builder edits cannot replace the active expiration, including after a cached run', async () => {
    const b = new WorkflowBuilder<number, number>();
    const first = b.startWith(identity);
    const detached = first.then(identity);
    detached.endWith(identity).expire(() => 1);
    const final = first.endWith(identity).delay(() => 10).expire(() => 20);
    for (let attempt = 0; attempt < 2; attempt++) {
        detached.endWith(identity).expire(() => 1);
        const result = b.run(3, new CancellationTokenSource());
        await flush();
        jest.advanceTimersByTime(10);
        await expect(result).resolves.toBe(3);
    }
    final.expire(() => 5);
    const result = expect(b.run(3, new CancellationTokenSource())).rejects.toEqual(WorkflowError.expired(5));
    await flush();
    jest.advanceTimersByTime(5);
    await result;
    jest.advanceTimersByTime(10);
    await flush();
});

test('unfinished direct builder chains retain their step output without an expiration', async () => {
    const b = new WorkflowBuilder<number, number>();
    b.startWith(identity);
    await expect(b.run(4, new CancellationTokenSource())).resolves.toBe(4);
});

test('an empty workflow fails explicitly', async () => {
    await expect(new WorkflowBuilder().run(1, new CancellationTokenSource())).rejects.toThrow('starting step');
});

test('standalone parallel builders return their results and defensively copy factories', async () => {
    const factories = [identity];
    const b = new WorkflowParallelBuilder(factories);
    factories.length = 0;
    await expect(b.run(9, new CancellationTokenSource())).resolves.toEqual([9]);
});

test('unlinked continuation rejects; linked builders expose their successor', async () => {
    const move = new WorkflowMoveNextBuilder();
    await expect(move.run(1, new CancellationTokenSource())).rejects.toThrow('Internal error in workflow');
    const first = new WorkflowNextBuilder(identity);
    const last = first.endWith(identity);
    expect(first.hasNext()).toBe(true);
    expect(first.getNext()).toBe(last);
});

test('a pre-cancelled condition skips predicate evaluation', async () => {
    const predicate = jest.fn(() => true);
    const branch = new WorkflowConditionBuilder(predicate);
    const cts = new CancellationTokenSource();
    cts.cancel();
    await expect(branch.run(1, cts)).rejects.toEqual(WorkflowError.cancelled());
    expect(predicate).not.toHaveBeenCalled();
});

test('public fluent methods validate missing callbacks and invalid parallel lists', () => {
    const first = new WorkflowBuilder<number, number>().startWith(identity);
    const branch = first.if(() => true).do(identity);
    const final = branch.endIf().endWith(identity);
    const invalid = [
        () => new WorkflowBuilder().startWith(null as any),
        () => first.then(null as any), () => first.endWith(null as any), () => first.if(null as any),
        () => first.delay(null as any), () => first.timeout(null as any),
        () => branch.delay(null as any), () => branch.timeout(null as any), () => branch.elseIf(null as any),
        () => first.if(() => true).do(null as any),
        () => final.delay(null as any), () => final.expire(null as any),
        () => first.parallel(null as any), () => first.parallel([null as any]),
        () => first.parallel({} as any)
    ];
    invalid.forEach(call => expect(call).toThrow());
});

test.each(['delay', 'timeout', 'expiration'])('throwing %s callbacks reject the workflow', async kind => {
    const error = new Error(kind);
    const fail = () => { throw error; };
    const w = workflow(b => {
        const first = b.startWith(identity);
        if (kind === 'delay') first.delay(fail);
        if (kind === 'timeout') first.timeout(fail);
        const final = first.endWith(identity);
        return kind === 'expiration' ? final.expire(fail) : final;
    });
    await expect(w.run(1)).rejects.toBe(error);
    expect(w.status).toBe(WorkflowStatus.Faulted);
    expect(jest.getTimerCount()).toBe(0);
});

test('a workflow can be rerun successfully after failing', async () => {
    let fail = true;
    const w = workflow(b => b.startWith(() => ({ run: async (n: number) => {
        if (fail) throw new Error('first attempt');
        return n;
    } })).endWith(identity));
    await expect(w.run(1)).rejects.toThrow('first attempt');
    fail = false;
    await expect(w.run(2)).resolves.toBe(2);
    expect(w.status).toBe(WorkflowStatus.Completed);
});
