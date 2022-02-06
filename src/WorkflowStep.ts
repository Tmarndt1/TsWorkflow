import { IWorkflowContext } from "./WorkflowContext";

export abstract class WorkflowStep<TInput, TOutput, TContext> {
    public abstract run(input: TInput, context: IWorkflowContext<TContext>): Promise<TOutput>;
}