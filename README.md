# TsWorkflow
A simple workflow library written in typescript 

```
class UpdateAgeStep extends WorkflowStep<void, number, { age: number }> {
    public run(input: void, context: IWorkflowContext<{ age: number }>): Promise<number> {
        return new Promise((resolve) => {
            resolve(++context.data.age);
        });
    }
    
}

class AlertAgeStep extends WorkflowStep<number, void, { age: number }> {
    public run(age: number, context: IWorkflowContext<{ age: number; }>): Promise<void> {
        return new Promise((resolve) => {
            alert(age);

            resolve();
        })
    }
}

class AgeWorkflow extends Workflow<{ age: number }> {
    public id: string = "age-workflow"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<{ age: number; }>): void {
        builder.startWith(UpdateAgeStep)
            .endWith(AlertAgeStep);
    }
}

let workflow: Workflow<{ age: number }> = new AgeWorkflow({ age: 30 });
```
