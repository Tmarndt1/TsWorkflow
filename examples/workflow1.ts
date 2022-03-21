import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { IWorkflowContext } from "../src/WorkflowContext";
import { WorkflowStep } from "../src/WorkflowStep";

class Birthday extends WorkflowStep<void, number, { age: number }> {
    public run(input: void, context: IWorkflowContext<{ age: number }>): Promise<number> {
        return Promise.resolve(context?.data?.age ? ++context.data.age : 0);
    }
}

class Highschool extends WorkflowStep<number, string, { age: number }> {
    public run(age: number): Promise<string> {
        return Promise.resolve("Contgratulations on graduating Highschool!");
    }
}

class College extends WorkflowStep<number, string, { age: number }> {
    public run(age: number): Promise<string> {
        return Promise.resolve("Contgratulations on graduating College!");
    }
}

class Retirement extends WorkflowStep<number, string, { age: number }> {
    public run(age: number): Promise<string> {
        return Promise.resolve("Contgratulations on retiring!");
    }
}

class UnknownAge extends WorkflowStep<number, string, { age: number }> {
    public run(age: number): Promise<string> {
        return Promise.resolve("Who knows...");
    }
}

class PrintAge extends WorkflowStep<string, string, { age: number }> {
    public run(result: string): Promise<string> {
        return Promise.resolve(result);
    }
}

/**
 * Simple age workflow example that increments an age and prints age in final step
 */
export class Workflow1 extends Workflow<{ age: number }, string> {
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
            .aggregate()
            .endWith(PrintAge);
    }
}