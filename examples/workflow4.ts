import CancellationTokenSource from "../src/CancellationTokenSource";
import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { IWorkflowContext } from "../src/WorkflowContext";
import { WorkflowStep } from "../src/WorkflowStep";

class Step1 extends WorkflowStep<void, number> {
    public run(input: void, context: IWorkflowContext<void>): Promise<number> {
        if (context?.cancellationTokenSource?.token.isCancelled()) return Promise.reject();
        return Promise.resolve(1);
    }
}

class Step2 extends WorkflowStep<number, number, void> {
    public run(input: number, context: IWorkflowContext<void>): Promise<number> {
        if (context?.cancellationTokenSource?.token.isCancelled()) return Promise.reject();
        return Promise.resolve(input++);
    }
}

class Step3 extends WorkflowStep<number, string> {
    public run(input: number, context: IWorkflowContext<void>): Promise<string> {
        if (context?.cancellationTokenSource?.token.isCancelled()) return Promise.reject();
        return Promise.resolve("Step 3 result..");
    }
}

class Step4 extends WorkflowStep<[number, string], [number, string]> {
    public run(input: [number, string], context: IWorkflowContext<void>): Promise<[number, string]> {
        if (context?.cancellationTokenSource?.token.isCancelled()) return Promise.reject();
        return Promise.resolve(input);
    }
}

class Workflow4 extends Workflow<void, [number, string]> {
    public id: string = "workflow-4"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<void, [number, string]>) {
        Promise.all
        return builder
            .startWith(Step1)
            .parallel([
               Step2, Step3
            ])
            .endWith(Step4)
    }
}

// Create new instance of the workflow
let workflow: Workflow<void, [number, string]> = new Workflow4();

let cts = new CancellationTokenSource();

// Run the workflow
workflow.run(cts).then(age => console.log(age)).catch(error => console.log(error));
