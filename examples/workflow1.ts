import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { IWorkflowContext } from "../src/WorkflowContext";
import { WorkflowStep } from "../src/WorkflowStep";

/**
 * Workflow step that increments the Workflow context's age property by 1
 */
class IncrementAge extends WorkflowStep<void, number, { age: number }> {
    public run(input: void, context: IWorkflowContext<{ age: number }>): Promise<number> {
        return Promise.resolve(++context.data.age);
    }
}

/**
 * Workflow step that alerts the Workflow's context age property
 */
class PrintAge extends WorkflowStep<number, number, { age: number }> {
    public run(age: number, context: IWorkflowContext<{ age: number; }>): Promise<number> {
        return Promise.resolve(++age);
    }
}

/**
 * Simple age workflow example that increments an age and prints age in final step
 */
class AgeWorkflow extends Workflow<{ age: number }, number> {
    public id: string = "age-workflow"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<{ age: number; }, number>) {
        return builder.startWith(IncrementAge)
            .delay(500)
            .if(x => x > 30)
                .do(IncrementAge)
            .delay(500)
            .if (x => x > 31)
                .do(IncrementAge)
            .delay(500)
            .endWith(PrintAge);
    }
}

// Create new instance of the workflow
let workflow: Workflow<{ age: number }, number> = new AgeWorkflow({ age: 30 });

// Run the workflow
workflow.run().then(age => console.log(age));