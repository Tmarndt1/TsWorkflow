import { Workflow1 } from "../examples/Workflow1";

test('Workflow1-test1', async () => {
    const workflow1 = new Workflow1(18, 5000, 0);

    let result = await workflow1.run();

    expect(result).toEqual("Contgratulations on graduating Highschool!");
});

test('Workflow1-test2', async () => {
    const workflow1 = new Workflow1(22, 5000, 0);

    let result = await workflow1.run();

    expect(result).toEqual("Contgratulations on graduating College!");
});

test('Workflow1-test3', async () => {
    const workflow1 = new Workflow1(60, 5000, 0);

    let result = await workflow1.run();

    expect(result).toEqual("Contgratulations on retiring!");
});

test('Workflow1-test4', async () => {
    const workflow1 = new Workflow1(60, 1, 0);

    try {
        const output = await workflow1.run();

        expect(output).toBeNull();
    } catch (error) {
        expect(error).toEqual(`Workflow expired after 1 ms`);
    }
});

test('Workflow1-test5', async () => {
    const workflow1 = new Workflow1(60, 0, 1);

    try {
        const output = await workflow1.run();

        expect(output).toBeNull();
    } catch (error) {
        expect(error).toEqual(`Step timed out after 1 ms`);
    }
});