import { Timing } from "../types/Timing";

/** Normalize fixed and dynamic durations without evaluating callbacks during build. */
export function toTiming(value: Timing): () => number {
    const validate = (milliseconds: number): number => {
        if (typeof milliseconds !== "number" || !Number.isFinite(milliseconds)) {
            throw new TypeError("Duration must be a finite number of milliseconds");
        }
        return milliseconds;
    };
    if (typeof value === "function") return () => validate(value());
    const milliseconds = validate(value);
    return () => milliseconds;
}
