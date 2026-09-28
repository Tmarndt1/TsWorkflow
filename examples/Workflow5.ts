import { defineWorkflow } from "../index";

/** Capture dependencies with a closure instead of a Workflow subclass. */
export function createPriceWorkflow(taxRate: number) {
    return defineWorkflow<number, string>(builder => builder
        .startWith(() => ({ run: amount => amount }))
        .if(amount => amount < 0)
            .stop()
        .endIf()
        .then(() => ({ run: amount => amount * (1 + taxRate) }))
        .timeout(1_000)
        .endWith(() => ({ run: amount => amount.toFixed(2) }))
        .expire(5_000));
}
