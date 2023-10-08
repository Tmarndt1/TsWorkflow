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

export class Workflow3 extends Workflow<void, string[]> {
    public build(builder: IWorkflowBuilder<void, string[]>) {        
        return builder
            .startWith(() => new Step1())
            .parallel([
                () => new Step2(),
                () => new Step3()
            ]).delay(() => 500).timeout(() => 6000)
            .if(x => x.length > 1)
                .do(() => ({
                    run: (input) => Promise.resolve(input)
                }))
            .endIf()
            .then(() => ({
                run: (input) => Promise.resolve(input)
            }))
            .endWith(() => ({
                run: (input) => Promise.resolve(input)
            }));
    }
}