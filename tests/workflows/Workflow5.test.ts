import { createPriceWorkflow } from "../../examples/Workflow5";
import { WorkflowErrorCode, WorkflowStatus } from "../../index";

test('function-based example uses captured configuration and synchronous steps', async () => {
    const workflow = createPriceWorkflow(0.2);
    await expect(workflow.run(10)).resolves.toBe('12.00');
    await expect(workflow.run(0)).resolves.toBe('0.00');
    expect(workflow.status).toBe(WorkflowStatus.Completed);
});

test('function-based example stops invalid input', async () => {
    const workflow = createPriceWorkflow(0.2);
    await expect(workflow.run(-1)).rejects.toMatchObject({ code: WorkflowErrorCode.Stopped });
    expect(workflow.status).toBe(WorkflowStatus.Stopped);
});
