import { IWorkflowBuilder, IWorkflowStep } from "../../index";

// Compiled by npm run lint. This function is intentionally never executed.
export function checkFluentTypes(builder: IWorkflowBuilder<number, string>) {
    const first = builder.startWith(() => ({ run: async (n: number) => n + 1 }));
    first.then(() => ({ run: async (n: number) => String(n) })).endWith(() => ({ run: async (s: string) => s }));
    // @ts-expect-error Sequential input must match the preceding output.
    first.then(() => ({ run: async (s: string) => s }));
    // @ts-expect-error Final output must match the workflow result.
    first.endWith(() => ({ run: async (n: number) => n }));
    // @ts-expect-error Parallel input must match the preceding output.
    first.parallel([() => ({ run: async (s: string) => s })]);
    const parallel = first.parallel([
        () => ({ run: async (n: number) => String(n) }),
        () => ({ run: async (n: number) => n > 0 })
    ]);
    parallel.then(() => ({ run: async (tuple: [string, boolean]) => tuple[0] })).endWith(() => ({ run: async (s: string) => s }));
    parallel.if(tuple => {
        const text: string = tuple[0];
        const flag: boolean = tuple[1];
        return flag && text.length > 0;
    }).stop().endIf().endWith(() => ({ run: async (tuple: [string, boolean]) => tuple[0] }));
    const branch = first.if(n => n > 0);
    // @ts-expect-error A condition needs an action before endIf.
    branch.endIf();
    const stopped = branch.stop();
    // @ts-expect-error Stopped branches cannot define an action.
    stopped.do(() => ({ run: async (n: number) => n }));
    const ended = stopped.endIf();
    // @ts-expect-error endIf exposes chaining operations only.
    ended.timeout(() => 1);
    const final = ended.endWith(() => ({ run: async (n: number) => String(n) }));
    // @ts-expect-error Nothing can be chained after the final step.
    final.then(() => ({ run: async (s: string) => s }));
    const step: IWorkflowStep<number, string> = { run: async n => String(n) };
    first.then(() => step);
}
