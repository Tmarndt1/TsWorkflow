import { WorkflowEvent } from "../src/Emitter";
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

class Step2 extends WorkflowStep<[WorkflowEvent<number>, string], string> {
    public run(input: [WorkflowEvent<number>, string]): Promise<string> {
        return Promise.resolve(`Step 2 ran${input[0].data}`);
    }
}

export class Workflow4 extends Workflow<void, string> {
    public build(builder: IWorkflowBuilder<void, string>) {
        return builder
            .startWith(() => new Step1())
                .timeout(() => 6000)
            .if(() => true)
                .do(() => ({
                    run: (input) => Promise.resolve(input)
                }))
            .endIf()
            .wait<number>("eventName")
            .then(() => ({
                run: (input) => Promise.resolve(input)
            }))
            .endWith(() => new Step2());
    }
}