import { IWorkflowStep } from "../WorkflowStep";

export type ParallelType<T> = T extends () => IWorkflowStep<any, infer TOutput> ? TOutput : unknown;