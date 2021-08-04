import { IWorkflowContext } from "./WorkflowContext";

export abstract class WorkflowStep<TInput, TOutput, TData> {
    public abstract run(input: TInput, context: IWorkflowContext<TData>): Promise<TOutput>;
}