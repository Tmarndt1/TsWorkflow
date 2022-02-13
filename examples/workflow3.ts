import CancellationTokenSource from "../src/CancellationTokenSource";
import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { IWorkflowContext } from "../src/WorkflowContext";
import { WorkflowStep } from "../src/WorkflowStep";

class Step1 extends WorkflowStep {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        if (context.cancellationTokenSource.token.isCancelled()) return Promise.reject();
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject();
            }, 1000);
        });
    }
}

class Step2 extends WorkflowStep {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        if (context.cancellationTokenSource.token.isCancelled()) return Promise.reject();

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (context.cancellationTokenSource.token.isCancelled()) {
                    reject();
                } else {
                    resolve(console.log("Step 2 ran..."));
                }
            }, 1000);
        });
    }
}

class Report extends WorkflowStep {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        if (context.cancellationTokenSource.token.isCancelled()) return Promise.reject();

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (context.cancellationTokenSource.token.isCancelled()) {
                    reject();
                } else {
                    resolve(console.log("Step 1 failed..."));
                } 
            }, 1000);
        });
    }
}


class Workflow2 extends Workflow {
    public id: string = "workflow-3"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<void, void>) {
        return builder
            .startWith(Step1)
                .timeout(1500)
                .failed(Report)
            .endWith(Step2)
                .expire(5000);
    }
}

// Create new instance of the workflow
let workflow: Workflow = new Workflow2();

// Run the workflow
workflow.run(new CancellationTokenSource())
    .then(age => console.log(age)).catch(error => console.log(error));
