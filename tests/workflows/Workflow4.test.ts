import { Workflow4 } from "../../examples/Workflow4";
import { WorkflowStatus } from "../../src/Workflow";

test('Workflow4 returns its final output', async () => {
    await expect(new Workflow4().run()).resolves.toBe("Step 2 ran...");
});

test('Workflow4 transitions from pending through running to completed', async () => {
    const workflow = new Workflow4();
    expect(workflow.status).toBe(WorkflowStatus.Pending);
    const promise = workflow.run();
    expect(workflow.status).toBe(WorkflowStatus.Running);
    await promise;
    expect(workflow.status).toBe(WorkflowStatus.Completed);
});
