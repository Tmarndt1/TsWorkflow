import CancellationTokenSource from "../src/CancellationTokenSource";
import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { IWorkflowContext } from "../src/WorkflowContext";
import { WorkflowStep } from "../src/WorkflowStep";

class Step1 extends WorkflowStep<void, void, void> {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        console.log("Step 1 ran");
        return Promise.resolve();
    }
}

class Step2 extends WorkflowStep<void, void, void> {
    public run(input: void, context: IWorkflowContext<void>, cts: CancellationTokenSource): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`Step 2 is cancelled: ${cts.token.isCancelled()}`);
                resolve();
            }, 4000);
        });
    }
}

class Step3 extends WorkflowStep<void, void, void> {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        console.log("Step 3 ran");
        return Promise.resolve();
    }
}

class Step4 extends WorkflowStep<void, void, void> {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        console.log("Step 4 ran");
        return Promise.resolve();
    }
}

/**
 * Simple age workflow example that increments an age and prints age in final step
 */
class Workflow2 extends Workflow<void, void> {
    public id: string = "age-workflow"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<void, void>) {
        return builder.startWith(Step1)
            .then(Step2)
                .timeout(3000).do(Step4)
            .endWith(Step3);
    }
}

// Create new instance of the workflow
let workflow: Workflow<void, void> = new Workflow2();

// Run the workflow
workflow.run().then(age => console.log(age)).catch(error => console.log(error));
