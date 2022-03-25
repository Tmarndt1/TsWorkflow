import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { IWorkflowContext } from "../src/WorkflowContext";
import { WorkflowStep } from "../src/WorkflowStep";

class Step1 extends WorkflowStep<void, number> {
    public run(input: void): Promise<number> {
        return Promise.resolve(99);
    }
}

class Step2 extends WorkflowStep<number, number> {
    public run(input: number): Promise<number> {
        return Promise.resolve(input++);
    }
}

/**
 * Workflow that rejects if condition is true
 */
export class Workflow5 extends Workflow<void, number> {
    public id: string = "workflow-5"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<void, number>) {
        return builder.startWith(Step1)
            .if(x => x == 99)
                .reject()
            .endIf()
            .endWith(Step2);
            
    }
}