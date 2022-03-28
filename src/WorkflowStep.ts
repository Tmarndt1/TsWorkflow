import { IWorkflowContext } from "./WorkflowContext";

/**
 * Abstract class or base class for the workflow steps. All derived WorkflowStep classes must implement the run method
 * which is called when it's the steps turn in the workflow. 
 */
export abstract class WorkflowStep<TInput = void, TOutput = void, TContext = void> {
    public abstract run(input: TInput, context: IWorkflowContext<TContext> | null): Promise<TOutput>;
}