import { Awaitable } from "../types/Awaitable";
import CancellationTokenSource from "../CancellationTokenSource";
import { WorkflowError } from "../WorkflowError";

/** Runs one operation, including its optional delay, within a time limit. */
export async function execute<T>(
    action: () => Awaitable<T>,
    cts: CancellationTokenSource,
    delay = 0,
    timeout = 0,
    timeoutError: (milliseconds: number) => WorkflowError = WorkflowError.timedOut
): Promise<T> {
    let delayTimer: ReturnType<typeof setTimeout> | undefined;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    const checkCancellation = () => {
        if (cts.token.isCancelled()) throw WorkflowError.cancelled();
    };

    checkCancellation();

    const run = async () => {
        if (delay > 0) {
            await new Promise<void>(resolve => {
                delayTimer = setTimeout(resolve, delay);
            });
        }
        checkCancellation();
        const output = await action();
        checkCancellation();
        return output;
    };

    try {
        if (!(timeout > 0)) return await run();

        const expiration = new Promise<never>((_, reject) => {
            timeoutTimer = setTimeout(() => {
                reject(timeoutError(timeout));
                cts.cancel();
            }, timeout);
        });
        return await Promise.race([run(), expiration]);
    } finally {
        clearTimeout(delayTimer);
        clearTimeout(timeoutTimer);
    }
}
