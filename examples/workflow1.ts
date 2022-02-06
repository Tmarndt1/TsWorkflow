import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { IWorkflowContext } from "../src/WorkflowContext";
import { WorkflowStep } from "../src/WorkflowStep";

/**
 * Workflow step that increments the Workflow context's age property by 1
 */
class UpdateAgeStep extends WorkflowStep<void, number, { age: number }> {
    public run(input: void, context: IWorkflowContext<{ age: number }>): Promise<number> {
        return Promise.resolve(++context.data.age);
    }
}

/**
 * Workflow step that alerts the Workflow's context age property
 */
class AlertAgeStep extends WorkflowStep<number, number, { age: number }> {
    public run(age: number, context: IWorkflowContext<{ age: number; }>): Promise<number> {
        return Promise.resolve(++age);
    }
}

/**
 * Simple age workflow example that increments an age and alerts it in the final step
 */
class AgeWorkflow extends Workflow<{ age: number }, number> {
    public id: string = "age-workflow"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<{ age: number; }, number>) {
        return builder.startWith(UpdateAgeStep)
            .endWith(AlertAgeStep);
    }
}

// Create new instance of the workflow
let workflow: Workflow<{ age: number }, number> = new AgeWorkflow({ age: 30 });

// Run the workflow
workflow.run().then(age => console.log(age));