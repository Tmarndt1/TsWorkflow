import { Workflow3 } from "../../examples/Workflow3";

test('Workflow3-test1', async () => {
    const workflow = new Workflow3();

    let array: string[] = await workflow.run();

    expect(array.length).toBe(2);
    expect(array[0]).toBe("1,2");
    expect(array[1]).toBe("1,3");
});