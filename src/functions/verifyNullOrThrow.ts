export function verifyNullOrThrow<TArgs>(func: (args?: TArgs) => any): void {
    if (func == null) throw new Error("Function cannot be null");
}