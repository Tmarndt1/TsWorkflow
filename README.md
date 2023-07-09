# Ts Workflow 

TsWorkflow is a lightweight and flexible TypeScript library for building and executing workflows. It provides a simple yet powerful way to define and orchestrate complex sequences of steps in a workflow, allowing developers to easily implement and manage business logic.

[![Main](https://github.com/Tmarndt1/TsWorkflow/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/Tmarndt1/TsWorkflow/actions/workflows/main.yml)

| Statements | Branches | Functions | Lines |
| -----------|----------|-----------|-------|
| ![Statements](./coverage/badge-statements.svg) | ![Branches](./coverage/badge-branches.svg) | ![Functions](./coverage/badge-functions.svg) | ![Lines](./coverage/badge-lines.svg)

## Give a Star! :star:

If you like or are using this project please give it a star. Thanks!

## Usage
```typescript
class Step1 extends WorkflowStep<number, string> {
    public run(input: number): Promise<string> {
        return Promise.resolve(`${input}`);
    }
}

class Step2 extends WorkflowStep<string, string> {
    public run(input: string, cts?: CancellationToken): Promise<string> {
        return Promise.resolve(`${input},2`);
    }
}

class Step3 extends WorkflowStep<string, string> {
    public run(input: string, cts?: CancellationToken): Promise<string> {
        return Promise.resolve(`${input},3`);
    }
}

export class RandomWorkflow extends Workflow<number, string[]> {
    public build(builder: IWorkflowBuilder<number, string[]>) {
        return builder
            // startWith API to define the first workflow step to run
            .startWith(() => new Step1())
            // parallel API to run multiple workflow steps at once and returns an array of results
            .parallel([
                () => new Step2(),
                () => new Step3()
            ]).delay(() => 500) // Will delay the parallel step's execution 500 milliseconds
            // endWith API to define the last workflow step to run
            .endWith(() => {
                // A worklow step can either be a class or an object that has a run method
                return {
                    run: (input) => Promise.resolve(input)
                }
            })
    }
}

const workflow = new RandomWorkflow();

try {
    const output: string[] = await workflow.run(1);

    // Handle businesss logic
} catch (error) {
    console.log(error);
}

```

## Authors

* **Travis Arndt**


## License

This project is licensed under the MIT License - [LICENSE.md](LICENSE)

