import { IWorkflowContext } from "./WorkflowContext";

export abstract class WorkflowStep<TInput = void, TOutput = void, TContext = void> {
    public abstract run(input: TInput, context: IWorkflowContext<TContext> | null): Promise<TOutput>;
}