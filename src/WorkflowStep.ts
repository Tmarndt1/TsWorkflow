/**
 * Abstract class or base class for the workflow steps. All derived WorkflowStep classes must implement the run method
 * which is called when it's the steps turn in the workflow. 
 */
export abstract class WorkflowStep<TInput, TOutput> implements IWorkflowStep<TInput, TOutput> {
    public abstract run(input: TInput): Promise<TOutput>;
}

export interface IWorkflowStep<TInput, TOutput> {
    run: (input: TInput) => Promise<TOutput>;
}