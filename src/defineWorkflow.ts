import { Workflow } from "./Workflow";
import { IWorkflowBuilder } from "./WorkflowBuilder";
import { IWorkflowFinalBuilder } from "./interfaces/IWorkflowFinalBuilder";
import { verifyNullOrThrow } from "./functions/verifyNullOrThrow";

/** Define a workflow with a closure instead of a subclass. Called once at definition time. */
export function defineWorkflow<TInput, TResult>(
    build: (builder: IWorkflowBuilder<TInput, TResult>) => IWorkflowFinalBuilder<any, TResult>
): Workflow<TInput, TResult> {
    verifyNullOrThrow(build);
    return new class extends Workflow<TInput, TResult> {
        public build(builder: IWorkflowBuilder<TInput, TResult>): IWorkflowFinalBuilder<any, TResult> {
            return build(builder);
        }
    }();
}
