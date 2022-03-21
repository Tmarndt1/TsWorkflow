import { Workflow1 } from "../examples/workflow1";

test('workflow1-test1', async () => {
    const workflow1 = new Workflow1({ age: 17 });

    let result = await workflow1.run();

    expect(result).toEqual("Contgratulations on graduating Highschool!")
});

test('workflow1-test2', async () => {
    const workflow1 = new Workflow1({ age: 21 });

    let result = await workflow1.run();

    expect(result).toEqual("Contgratulations on graduating College!")
});

test('workflow1-test3', async () => {
    const workflow1 = new Workflow1({ age: 59 });

    let result = await workflow1.run();

    expect(result).toEqual("Contgratulations on retiring!")
});