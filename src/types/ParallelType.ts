import { WorkflowStep } from "../WorkflowStep";

export type ParallelType<T> = T extends () => WorkflowStep<unknown, infer TOutput> ? TOutput : unknown;
