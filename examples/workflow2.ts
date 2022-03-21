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
                    resolve();
                }
            }, 100);
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
            }, 100);
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
                    resolve();
                }
            }, 100);
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
                    resolve();
                }
            }, 100);
        });
    }
}

export class Workflow2 extends Workflow {
    public id: string = "workflow-2"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<void, void>) {
        return builder
            .startWith(Step1)
                .timeout(150)
            .then(Step2)
                .timeout(150)
            .then(Step3)
                .timeout(150)
            .endWith(Step4)
                .expire(500);
    }
}
