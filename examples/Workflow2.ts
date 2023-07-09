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

export class Workflow2 extends Workflow<string> {
    public build(builder: IWorkflowBuilder<string>) {
        return builder
            .startWith(() => new Step1())
                .delay(10)
            .endWith(() => new Step2());
    }
}