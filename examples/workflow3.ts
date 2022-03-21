import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { IWorkflowContext } from "../src/WorkflowContext";
import { WorkflowStep } from "../src/WorkflowStep";

class Step1 extends WorkflowStep {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        if (context?.cancellationTokenSource?.token.isCancelled()) return Promise.reject();
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject("Workflow error");
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
                    resolve();
                }
            }, 1000);
        });
    }
}

class Report extends WorkflowStep {
    public run(input: void, context: IWorkflowContext<void>): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(); 
            }, 1000);
        });
    }
}


export class Workflow3 extends Workflow {
    public id: string = "workflow-3"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<void, void>) {
        return builder
            .startWith(Step1)
                .error(Report)
            .endWith(Step2)
                .expire(500);
    }
}
