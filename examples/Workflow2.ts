import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { WorkflowStep } from "../src/WorkflowStep";

class Step1 extends WorkflowStep<void, string> {
    public constructor() {
        super();
    }

    public run(input: void): Promise<string> {
        return Promise.resolve("Step1 ran...");
    }
}

class Step2 extends WorkflowStep<void, string> {
    public run(): Promise<string> {
        return Promise.resolve("Step2 ran...");
    }
}


/**
 * Simple age workflow example that increments an age and prints age in final step
 */
export class Workflow2 extends Workflow<string> {
    public id: string = "workflow-1"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<string>) {
        return builder
            .startWith(() => new Step1())
                .delay(10)
            .endWith(() => new Step2());
    }
}