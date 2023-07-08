import { Workflow2 } from "../examples/Workflow2";

test('Workflow3-test1', async () => {
    const workflow = new Workflow2();

    expect(await workflow.run()).toEqual("Step2 ran...")
});