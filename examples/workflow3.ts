import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { WorkflowStep } from "../src/WorkflowStep";

class Step1 extends WorkflowStep<void, string> {
    public run(): Promise<string> {
        return Promise.resolve("1");
    }
}

class Step2 extends WorkflowStep<string, string> {
    public run(input: string): Promise<string> {
        return Promise.resolve(`${input},2`);
    }
}

class Step3 extends WorkflowStep<string, string> {
    public run(input: string): Promise<string> {
        return Promise.resolve(`${input},3`);
    }
}

/**
 * Simple age workflow example that increments an age and prints age in final step
 */
export class Workflow3 extends Workflow<string[]> {
    public id: string = "workflow-1"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<string[]>) {
        return builder
            .startWith(() => new Step1())
            .parallel([
                () => new Step2(),
                () => new Step3()
            ])
            .endWith(() => {
                return {
                    run: (input) => Promise.resolve(input)
                }
            })
    }
}