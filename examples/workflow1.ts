import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { IWorkflowContext } from "../src/WorkflowContext";
import { WorkflowStep } from "../src/WorkflowStep";

class Birthday extends WorkflowStep<void, number, { age: number }> {
    public run(input: void, context: IWorkflowContext<{ age: number }>): Promise<number> {
        return Promise.resolve(++context.data.age);
    }
}

class Highschool extends WorkflowStep<number, string, { age: number }> {
    public run(input: number, context: IWorkflowContext<{ age: number }>): Promise<string> {
        console.log("Contgratulations on graduating Highschool!");
        return Promise.resolve(context.data.age.toString());
    }
}

class College extends WorkflowStep<number, string, { age: number }> {
    public run(input: number, context: IWorkflowContext<{ age: number }>): Promise<string> {
        console.log("Contgratulations on graduating College!");
        return Promise.resolve(context.data.age.toString());
    }
}

class Retirement extends WorkflowStep<number, number, { age: number }> {
    public run(input: number, context: IWorkflowContext<{ age: number }>): Promise<number> {
        console.log("Contgratulations on retiring!");
        return Promise.resolve(context.data.age);
    }
}

class UnknownAge extends WorkflowStep<number, number, { age: number }> {
    public run(input: number, context: IWorkflowContext<{ age: number }>): Promise<number> {
        console.log("Who knows...");
        return Promise.resolve(context.data.age);
    }
}

class PrintAge extends WorkflowStep<number, string, { age: number }> {
    public run(age: number, context: IWorkflowContext<{ age: number; }>): Promise<string> {
        return Promise.resolve(`Age: ${age}`);
    }
}

/**
 * Simple age workflow example that increments an age and prints age in final step
 */
class Workflow1 extends Workflow<{ age: number }, string> {
    public id: string = "workflow-1"
    public version: string = "1";

    public build(builder: IWorkflowBuilder<{ age: number; }, string>) {
        return builder.startWith(Birthday)
            .if(x => x == 18)
                .do(Highschool)
            .elseIf(x => x == 22)
                .do(College)
            .elseIf(x => x == 60)
                .do(Retirement)
            .else()
                .do(UnknownAge)
                    .delay(3000)
            .aggregate()
            .endWith(PrintAge);
    }
}

// Create new instance of the workflow
let workflow: Workflow<{ age: number }, string> = new Workflow1({ age: 100 });

// Run the workflow
workflow.run().then(age => console.log(age));