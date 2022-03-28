import { Workflow5 } from "../examples/workflow5";

test('workflow1-test5', async () => {
    const workflow5 = new Workflow5();

    try {
        await workflow5.run();
        fail();
    } catch (error) {
        expect(error).toEqual("Workflow manually rejected")
    }
});
