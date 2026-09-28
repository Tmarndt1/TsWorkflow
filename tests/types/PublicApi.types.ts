import {
    Awaitable, CancellationTokenSource, defineWorkflow, IWorkflow, IWorkflowBuilder,
    IWorkflowConditionBuilder, IWorkflowDoBuilder, IWorkflowElseBuilder,
    IWorkflowFinalBuilder, IWorkflowIfBuilder, IWorkflowNextBuilder, IWorkflowNextExtBuilder,
    IWorkflowParallelBuilder, IWorkflowStoppedBuilder, IWorkflowAggregateBuilder,
    ICancellationToken, ICancellationTokenSource, ParallelType, Timing, Workflow, WorkflowRunArgs
} from "../../index";

// Compiled, never executed. Exact-type assertions catch accidental widening to any.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type PromiseOutput = Assert<Equal<ParallelType<() => { run: (n: number) => Promise<string> }>, string>>;
type SyncOutput = Assert<Equal<ParallelType<() => { run: (n: number) => string }>, string>>;
type NotAStep = Assert<Equal<ParallelType<number>, unknown>>;

export function publicApiTypes() {
    const w = defineWorkflow<number, string>(b => b.startWith(() => ({ run: n => String(n) }))
        .delay(1).timeout(() => 20).endWith(() => ({ run: text => text })).expire(100));
    const source: ICancellationTokenSource = new CancellationTokenSource();
    const token: ICancellationToken = source.token;
    token.throwIfCancelled();
    const result: Promise<string> = w.run(1, new CancellationTokenSource());
    // @ts-expect-error Required workflow input cannot be omitted.
    w.run();
    // @ts-expect-error Required workflow input cannot be undefined.
    w.run(undefined);
    // @ts-expect-error Input must match TInput.
    w.run('1');
    const contract: IWorkflow<number, string> = w;
    // @ts-expect-error The interface also requires input.
    contract.run();
    const base: Workflow<number, string> = w;
    // @ts-expect-error The class also requires input.
    base.run();
    const optional = defineWorkflow<number | undefined, number>(b => b.startWith(() => ({ run: n => n ?? 0 })).endWith(() => ({ run: n => n })));
    optional.run();
    optional.run(undefined, new CancellationTokenSource());
    const voidWorkflow = defineWorkflow<void, number>(b => b.startWith(() => ({ run: () => 1 })).endWith(() => ({ run: n => n })));
    voidWorkflow.run();
    const nullWorkflow = defineWorkflow<number | null, number>(b => b.startWith(() => ({ run: n => n ?? 0 })).endWith(() => ({ run: n => n })));
    nullWorkflow.run(null);
    // @ts-expect-error Nullability does not imply input may be omitted.
    nullWorkflow.run();
    const duration: Timing = 10;
    const sync: Awaitable<number> = 1;
    const async: Awaitable<number> = Promise.resolve(1);
    const args: WorkflowRunArgs<number> = [1];
    // @ts-expect-error A definition must finish its chain.
    defineWorkflow<number, number>(b => b.startWith(() => ({ run: n => n })));
    return { result, duration, sync, async, args };
}

export function conditionalTypes(b: IWorkflowBuilder<number, string>) {
    const first = b.startWith(() => ({ run: n => n }));
    const branch = first.if(n => n > 0).do(() => ({ run: n => String(n) }));
    branch.elseIf(n => n === 0).do(() => ({ run: n => n.toFixed(0) }));
    // @ts-expect-error Later branches receive the original number, not a previous branch's string.
    branch.elseIf(n => n === 0).do(() => ({ run: (n: string) => n }));
    branch.endIf().then(() => ({ run: value => {
        const exact: Assert<Equal<typeof value, number | string>> = true;
        return String(value);
    } }));
    // @ts-expect-error A non-exhaustive condition can pass a number through.
    branch.endIf().then(() => ({ run: (value: string) => value }));
    branch.else().do(() => ({ run: n => n.toFixed(0) })).endIf().endWith(() => ({ run: value => {
        const exact: Assert<Equal<typeof value, string>> = true;
        return value.toUpperCase();
    } }));
    branch.else().stop().endIf().endWith(() => ({ run: text => {
        const exact: Assert<Equal<typeof text, string>> = true;
        return text;
    } }));
    first.if(() => true).stop().else().stop().endIf().endWith(() => ({ run: unreachable => {
        const exact: Assert<Equal<typeof unreachable, never>> = true;
        return 'unreachable';
    } }));
    const mixed = first.if(n => n > 0).do(() => ({ run: n => String(n) }))
        .elseIf(n => n === 0).do(() => ({ run: n => n === 0 }))
        .else().do(() => ({ run: n => ({ value: n }) })).endIf();
    mixed.endWith(() => ({ run: value => {
        const exact: Assert<Equal<typeof value, string | boolean | { value: number }>> = true;
        return String(value);
    } }));
    first.parallel([() => ({ run: n => n }), () => ({ run: n => String(n) })])
        .if(tuple => tuple[0] > 0).do(() => ({ run: tuple => tuple[1] }))
        .else().stop().endIf().endWith(() => ({ run: text => {
            const exact: Assert<Equal<typeof text, string>> = true;
            return text;
        } }));
}

// Public builder views must remain importable from the package root.
export type PublicBuilderViews = [
    IWorkflowConditionBuilder<number, never, string>, IWorkflowDoBuilder<number, string, string>,
    IWorkflowElseBuilder<number, string, string>, IWorkflowFinalBuilder<string, string>,
    IWorkflowIfBuilder<number, string, string>, IWorkflowNextBuilder<number, string, string>,
    IWorkflowNextExtBuilder<number, string, string>, IWorkflowParallelBuilder<number, string, string>,
    IWorkflowStoppedBuilder<number, string, string>, IWorkflowAggregateBuilder<number, string, string>
];
