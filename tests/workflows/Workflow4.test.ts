import { Workflow4 } from "../../examples/Workflow4";
import { WorkflowStatus } from "../../src/Workflow";

test('Workflow4-test1', () => {
    const workflow = new Workflow4();

    const promise = workflow.run();

    expect(promise).resolves.toBe("Step 2 ran...");
});

test('Workflow4-test2', () => {
    const workflow = new Workflow4();

    expect(workflow.status).toBe(WorkflowStatus.Pending);

    const promise = workflow.run();

    expect(workflow.status).toBe(WorkflowStatus.Running);

    let result: string = "";

    setTimeout(() => {
        promise.then(output => {
            result = output;
        });

        expect(workflow.status).toBe(WorkflowStatus.Completed);
        expect(result).toBe("");
    }, 600);
});