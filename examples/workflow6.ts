import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { IWorkflowContext } from "../src/WorkflowContext";
import { WorkflowFault } from "../src/WorkflowFault";
import { WorkflowStep } from "../src/WorkflowStep";

class Step1 extends WorkflowStep {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        if (context?.cancellationTokenSource?.token.isCancelled()) return Promise.reject();
        
        return new Promise((resolve, reject) => {
            reject("Workflow error in step 1");
        });
    }
}


class FaultStep extends WorkflowStep<WorkflowFault, string> {
    public run(input: WorkflowFault): Promise<string> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (typeof(input?.fault) === "string") {
                    resolve("Captured: " + input.fault);
                } else {
                    reject("Didn't capture fault from previous step");
                }
            }, 1000);
        });
    }
}

class Step2 extends WorkflowStep<string, string> {
    public run(input: string, context: IWorkflowContext<void>): Promise<string> {
        if (context?.cancellationTokenSource?.token.isCancelled()) return Promise.reject();

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (context?.cancellationTokenSource?.token.isCancelled()) {
                    reject(input);
                } else {
                    resolve(input);
                }
            }, 1000);
        });
    }
}

export class Workflow6 extends Workflow<void, string> {
    public id: string = "workflow-3"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<void, string>) {
        return builder
            .startWith(Step1)
                .onFailure()
                    .continueWith(FaultStep)
            .endWith(Step2);
    }
}
