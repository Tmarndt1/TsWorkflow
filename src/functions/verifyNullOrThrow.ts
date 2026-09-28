export function verifyNullOrThrow(func: unknown): asserts func is (...args: any[]) => unknown {
    if (typeof func !== "function") throw new TypeError("Expected a function");
}
