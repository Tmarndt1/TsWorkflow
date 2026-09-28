import {
    CancellationTokenSource, defineWorkflow, Workflow, WorkflowError, WorkflowErrorCode,
    WorkflowStatus, WorkflowStep, IWorkflowBuilder, IWorkflowFinalBuilder, Timing
} from "../../index";
import { WorkflowError as LegacyWorkflowError, WorkflowErrorCode as LegacyWorkflowErrorCode } from "../../src/WorkfowError";

const identity = () => ({ run: (input: number) => input });
const flush = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };

beforeEach(() => jest.useFakeTimers('modern'));
afterEach(() => jest.useRealTimers());

test('function definitions capture configuration and build once, with fresh steps per run', async () => {
    const configuration = { prefix: 'initial' };
    const factory = jest.fn(() => ({ run: (n: number) => `${configuration.prefix}:${n}` }));
    const build = jest.fn((b: IWorkflowBuilder<number, string>) => b.startWith(factory)
        .endWith(() => ({ run: value => value })));
    const w = defineWorkflow(build);
    expect(w).toBeInstanceOf(Workflow);
    expect(w.status).toBe(WorkflowStatus.Pending);
    await expect(w.run(1)).resolves.toBe('initial:1');
    configuration.prefix = 'updated';
    await expect(w.run(2)).resolves.toBe('updated:2');
    expect(build).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(w.status).toBe(WorkflowStatus.Completed);
});

test('function definitions reject invalid builders and propagate build errors', () => {
    expect(() => defineWorkflow(null as any)).toThrow(TypeError);
    const error = new Error('build failed');
    expect(() => defineWorkflow(() => { throw error; })).toThrow(error);
});

test('synchronous subclasses and objects mix with asynchronous and thenable steps', async () => {
    class Increment extends WorkflowStep<number, number> {
        public run(input: number): number { return input + 1; }
    }
    const w = defineWorkflow<number, string>(b => b.startWith(() => new Increment())
        .then(() => ({ run: input => Promise.resolve(input * 2) }))
        .parallel([
            () => ({ run: input => input + 1 }),
            () => ({ run: input => Promise.resolve(String(input)) })
        ])
        .endWith(() => ({ run: ([number, text]) => `${number}:${text}` })));
    await expect(w.run(2)).resolves.toBe('7:6');

    const thenable: PromiseLike<number> = { then: (resolve, reject) => Promise.resolve(9).then(resolve, reject) };
    const thenableWorkflow = defineWorkflow<void, number>(b => b.startWith(() => ({ run: () => thenable })).endWith(identity));
    await expect(thenableWorkflow.run()).resolves.toBe(9);
});

test.each([1, 2, 3, 4])('conditional actions receive original input and exhaustive branches return only their outputs (%i)', async input => {
    const w = defineWorkflow<number, string | boolean>(b => b.startWith(identity)
        .if(n => n === 1).do(() => ({ run: n => `first:${n.toFixed(0)}` }))
        .elseIf(n => n === 2).do(() => ({ run: n => n > 0 }))
        .elseIf(n => n === 3).stop()
        .else().do(() => ({ run: n => `else:${n.toFixed(0)}` }))
        .endIf().endWith(() => ({ run: value => value })));
    if (input === 3) {
        await expect(w.run(input)).rejects.toMatchObject({ code: WorkflowErrorCode.Stopped });
    } else {
        await expect(w.run(input)).resolves.toBe(input === 1 ? 'first:1' : input === 2 ? true : 'else:4');
    }
});

test('an exhaustive stopping else preserves only successful branch output types', async () => {
    const w = defineWorkflow<number, string>(b => b.startWith(identity)
        .if(n => n > 0).do(() => ({ run: n => String(n) }))
        .else().stop().endIf().endWith(() => ({ run: text => text.toUpperCase() })));
    await expect(w.run(1)).resolves.toBe('1');
    await expect(w.run(0)).rejects.toMatchObject({ code: WorkflowErrorCode.Stopped });
});

test('non-exhaustive conditions preserve pass-through values', async () => {
    const w = defineWorkflow<number, number | string>(b => b.startWith(identity)
        .if(n => n > 0).do(() => ({ run: n => String(n) }))
        .endIf().endWith(() => ({ run: value => value })));
    await expect(w.run(0)).resolves.toBe(0);
    await expect(w.run(1)).resolves.toBe('1');
});

test('exported cancellation source cancels a run and exposes a structured token error', async () => {
    const source = new CancellationTokenSource();
    const run = jest.fn((n: number) => n);
    const w = defineWorkflow<number, number>(b => b.startWith(() => ({ run })).delay(10).endWith(identity));
    const result = expect(w.run(1, source)).rejects.toMatchObject({ code: WorkflowErrorCode.Cancelled });
    source.cancel();
    jest.advanceTimersByTime(10);
    await result;
    expect(w.status).toBe(WorkflowStatus.Faulted);
    expect(run).not.toHaveBeenCalled();
    expect(() => source.token.throwIfCancelled()).toThrow(WorkflowError);
});

test('void and undefined-accepting definitions support omitted input and optional cancellation sources', async () => {
    const noInput = defineWorkflow<void, number>(b => b.startWith(() => ({ run: () => 3 })).endWith(identity));
    await expect(noInput.run()).resolves.toBe(3);
    await expect(noInput.run(undefined, new CancellationTokenSource())).resolves.toBe(3);
    const optional = defineWorkflow<number | undefined, number>(b => b.startWith(() => ({ run: n => n ?? 8 })).endWith(identity));
    await expect(optional.run()).resolves.toBe(8);
    await expect(optional.run(2)).resolves.toBe(2);
});

test.each(['sequential', 'parallel', 'conditional', 'else', 'final'])('numeric delays apply to %s steps', async kind => {
    const run = jest.fn((n: number) => n + 1);
    const w = defineWorkflow<number, number>(b => {
        const first = b.startWith(identity);
        if (kind === 'parallel') return first.parallel([() => ({ run })]).delay(10)
            .endWith(() => ({ run: ([n]) => n }));
        if (kind === 'conditional') return first.if(() => true).do(() => ({ run })).delay(10).endIf().endWith(identity);
        if (kind === 'else') return first.if(() => false).stop().else().do(() => ({ run })).delay(10).endIf().endWith(identity);
        if (kind === 'final') return first.endWith(() => ({ run })).delay(10);
        return first.then(() => ({ run })).delay(10).endWith(identity);
    });
    const result = w.run(1);
    await flush();
    jest.advanceTimersByTime(9);
    await flush();
    expect(run).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await expect(result).resolves.toBe(2);
});

test.each(['sequential', 'parallel', 'conditional', 'else', 'workflow'])('numeric %s time limits reject with codes and duration metadata', async kind => {
    const w = defineWorkflow<number, number>(b => {
        const first = b.startWith(identity);
        if (kind === 'parallel') return first.parallel([identity]).delay(20).timeout(10).endWith(() => ({ run: ([n]) => n }));
        if (kind === 'conditional') return first.if(() => true).do(identity).delay(20).timeout(10).endIf().endWith(identity);
        if (kind === 'else') return first.if(() => false).stop().else().do(identity).delay(20).timeout(10).endIf().endWith(identity);
        if (kind === 'workflow') return first.endWith(identity).delay(20).expire(10);
        return first.delay(20).timeout(10).endWith(identity);
    });
    const code = kind === 'workflow' ? WorkflowErrorCode.Expired : WorkflowErrorCode.TimedOut;
    const result = expect(w.run(1)).rejects.toMatchObject({ name: 'WorkflowError', code, milliseconds: 10 });
    await flush();
    jest.advanceTimersByTime(10);
    await result;
    jest.advanceTimersByTime(20);
    await flush();
    expect(w.status).toBe(WorkflowStatus.Faulted);
    expect(jest.getTimerCount()).toBe(0);
});

test('dynamic timings evaluate at execution and reevaluate on later runs', async () => {
    let delay = 5;
    const duration = jest.fn(() => delay);
    const w = defineWorkflow<number, number>(b => b.startWith(identity).delay(duration).timeout(20).endWith(identity).expire(50));
    expect(duration).not.toHaveBeenCalled();
    for (const value of [5, 10]) {
        delay = value;
        const result = w.run(value);
        jest.advanceTimersByTime(value);
        await expect(result).resolves.toBe(value);
    }
    expect(duration).toHaveBeenCalledTimes(2);
});

test.each([NaN, Infinity, -Infinity, '10', null, undefined])('invalid fixed durations fail during configuration (%s)', value => {
    expect(() => defineWorkflow<number, number>(b => b.startWith(identity).delay(value as Timing).endWith(identity)))
        .toThrow(TypeError);
});

test.each([NaN, Infinity, '10'])('invalid dynamic durations reject during execution (%s)', value => {
    const w = defineWorkflow<number, number>(b => b.startWith(identity).delay(() => value as number).endWith(identity));
    return expect(w.run(1)).rejects.toThrow(TypeError);
});

test('structured errors retain messages, stacks, codes, and duration metadata', () => {
    const errors = [WorkflowError.cancelled(), WorkflowError.stopped(), WorkflowError.timedOut(10), WorkflowError.expired(20)];
    expect(errors.map(error => error.code)).toEqual(['CANCELLED', 'STOPPED', 'TIMED_OUT', 'EXPIRED']);
    expect(errors.map(error => error.milliseconds)).toEqual([undefined, undefined, 10, 20]);
    for (const error of errors) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(WorkflowError);
        expect(error.name).toBe('WorkflowError');
        expect(error.stack).toContain(error.message);
    }
});

test('legacy error import paths share the public error class and codes', () => {
    const error = WorkflowError.cancelled();
    expect(error).toBeInstanceOf(LegacyWorkflowError);
    expect(error.code).toBe(LegacyWorkflowErrorCode.Cancelled);
});

test('application rejections remain unchanged and matching strings are not interpreted as control errors', async () => {
    const reasons = [new Error('application failed'), WorkflowError.stopped().message];
    for (const reason of reasons) {
        const w = defineWorkflow<number, number>(b => b.startWith(() => ({ run: () => { throw reason; } })).endWith(identity));
        await expect(w.run(1)).rejects.toBe(reason);
        expect(w.status).toBe(WorkflowStatus.Faulted);
    }
});

test('the class API accepts numeric timing and synchronous steps', async () => {
    class Example extends Workflow<number, number> {
        public build(b: IWorkflowBuilder<number, number>): IWorkflowFinalBuilder<number, number> {
            return b.startWith(identity).timeout(0).endWith(identity).delay(-1).expire(0);
        }
    }
    await expect(new Example().run(2)).resolves.toBe(2);
});
