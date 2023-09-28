import { Workflow1 } from "../../examples/Workflow1";
import { WorkflowStatus } from "../../src/Workflow";

test('Workflow1-test1', async () => {
    const workflow = new Workflow1(5000, 0);

    let result = await workflow.run(18);

    expect(workflow.status).toBe(WorkflowStatus.Completed);
    expect(result).toEqual("Contgratulations on graduating Highschool!");
});

test('Workflow1-test2', async () => {
    const workflow = new Workflow1(5000, 0);

    let result = await workflow.run(22);

    expect(workflow.status).toBe(WorkflowStatus.Completed);
    expect(result).toEqual("Contgratulations on graduating College!");
});

test('Workflow1-test3', async () => {
    const workflow = new Workflow1(5000, 0);

    let result = await workflow.run(60);

    expect(workflow.status).toBe(WorkflowStatus.Completed);
    expect(result).toEqual("Contgratulations on retiring!");
});

test('Workflow1-test4', async () => {
    const workflow = new Workflow1(1, 0);

    try {
        const output = await workflow.run(60);

        expect(output).toBeNull();
    } catch (error) {
        expect(error).toEqual(`Workflow expired after 1 ms`);
    }
});

test('Workflow1-test5', async () => {
    const workflow = new Workflow1(0, 1);

    try {
        const output = await workflow.run(60);

        expect(output).toBeNull();
    } catch (error) {
        expect(error).toEqual(`Step timed out after 1 ms`);
    }

    expect(workflow.status).toBe(WorkflowStatus.Faulted);
});


test('Workflow1-test5', async () => {
    const workflow = new Workflow1(0, 1);

    try {
        const output = await workflow.run(-1);

        expect(output).toBeNull();
    } catch (error) {
        expect(error).toEqual(`Workflow manually stopped`);
    }

    expect(workflow.status).toBe(WorkflowStatus.Faulted);
});