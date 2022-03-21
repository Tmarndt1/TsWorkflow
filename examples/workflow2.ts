import CancellationTokenSource from "../src/CancellationTokenSource";
import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { IWorkflowContext } from "../src/WorkflowContext";
import { WorkflowStep } from "../src/WorkflowStep";

class Step1 extends WorkflowStep {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        if (context?.cancellationTokenSource?.token.isCancelled()) return Promise.reject();
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (context?.cancellationTokenSource?.token.isCancelled()) {
                    reject();
                } else {
                    console.log("Step 1 ran...");

                    resolve();
                }
            }, 1000);
        });
    }
}

class Step2 extends WorkflowStep {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        if (context?.cancellationTokenSource?.token.isCancelled()) return Promise.reject();

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (context?.cancellationTokenSource?.token.isCancelled()) {
                    reject();
                } else {
                    console.log("Step 2 ran...");

                    resolve();
                }
            }, 1000);
        });
    }
}

class Step3 extends WorkflowStep {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        if (context?.cancellationTokenSource?.token.isCancelled()) return Promise.reject();

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (context?.cancellationTokenSource?.token.isCancelled()) {
                    reject();
                } else {
                    console.log("Step 3 ran...");

                    resolve();
                }
            }, 1000);
        });
    }
}

class Step4 extends WorkflowStep {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        if (context?.cancellationTokenSource?.token.isCancelled()) return Promise.reject();

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (context?.cancellationTokenSource?.token.isCancelled()) {
                    reject();
                } else {
                    console.log("Step 4 ran...");

                    resolve();
                }
            }, 1000);
        });
    }
}

class TimeoutStep extends WorkflowStep {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        if (context?.cancellationTokenSource?.token.isCancelled()) return Promise.reject();

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (context?.cancellationTokenSource?.token.isCancelled()) {
                    reject();
                } else {
                    console.log("Timeout step ran...");

                    resolve();
                }
            }, 1000);
        });
    }
}

class Workflow2 extends Workflow {
    public id: string = "workflow-2"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<void, void>) {
        return builder
            .startWith(Step1)
                .timeout(1500)
            .then(Step2)
                .timeout(1500)
            .then(Step3)
                .timeout(1500)
            .endWith(Step4)
                .expire(5000);
    }
}

// Create new instance of the workflow
let workflow: Workflow = new Workflow2();

let cts = new CancellationTokenSource();

// Run the workflow
workflow.run(cts).then(age => console.log(age)).catch(error => console.log(error));
