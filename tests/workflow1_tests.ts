import { Workflow1 } from "../examples/workflow1";

test('workflow1', async () => {
    const workflow1 = new Workflow1({ age: 18 });

    expect(await workflow1.run()).toEqual("Contgratulations on graduating Highschool!")
});