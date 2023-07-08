import { Workflow1 } from "../examples/Workflow1";

test('Workflow1-test1', async () => {
    const workflow1 = new Workflow1(18);

    let result = await workflow1.run();

    expect(result).toEqual("Contgratulations on graduating Highschool!")
});

test('Workflow1-test2', async () => {
    const workflow1 = new Workflow1(22);

    let result = await workflow1.run();

    expect(result).toEqual("Contgratulations on graduating College!")
});

test('Workflow1-test3', async () => {
    const workflow1 = new Workflow1(60);

    let result = await workflow1.run();

    expect(result).toEqual("Contgratulations on retiring!")
});