# TsWorkflow
A simple workflow library written in typescript 

```
/**
 * Workflow step that increments the Workflow context's age property by 1
 */
class Birthday extends WorkflowStep<void, number, { age: number }> {
    public run(input: void, context: IWorkflowContext<{ age: number }>): Promise<number> {
        return Promise.resolve(++context.data.age);
    }
}

/**
 * Workflow step that sends fake birthday email
 */
 class Highschool extends WorkflowStep<void, number, { age: number }> {
    public run(input: void, context: IWorkflowContext<{ age: number }>): Promise<number> {
        console.log("Contgratulations on graduating!");
        return Promise.resolve(context.data.age);
    }
}

/**
 * Workflow step that sends fake birthday email
 */
 class Retirement extends WorkflowStep<void, number, { age: number }> {
    public run(input: void, context: IWorkflowContext<{ age: number }>): Promise<number> {
        console.log("Contgratulations on retirement!");
        return Promise.resolve(context.data.age);
    }
}

/**
 * Workflow step that alerts the Workflow's context age property
 */
class PrintAge extends WorkflowStep<number, string, { age: number }> {
    public run(age: number, context: IWorkflowContext<{ age: number; }>): Promise<string> {
        return Promise.resolve(`Age: ${age}`);
    }
}

/**
 * Simple age workflow example that increments an age and prints age in final step
 */
class AgeWorkflow extends Workflow<{ age: number }, string> {
    public id: string = "age-workflow"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<{ age: number; }, string>) {
        return builder.startWith(Birthday)
            .delay(100)
            .if (x => x > 18)
                .do(Highschool)
            .delay(100)
            .if(x => x > 60)
                .do(Retirement)
            .delay(100)
            .endWith(PrintAge);
    }
}

// Create new instance of the workflow
let workflow: Workflow<{ age: number }, string> = new AgeWorkflow({ age: 18 });

// Run the workflow
workflow.run().then(age => console.log(age));
```
