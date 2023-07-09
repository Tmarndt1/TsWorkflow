import { Workflow } from "../src/Workflow";
import { IWorkflowBuilder } from "../src/WorkflowBuilder";
import { WorkflowStep } from "../src/WorkflowStep";

class Birthday extends WorkflowStep<void, number> {
    private _age: number = 0;
    public constructor(age: number) {
        super();
        this._age = age;
    }

    public run(input: void): Promise<number> {
        return Promise.resolve(this._age);
    }
}

class Highschool extends WorkflowStep<number, string> {
    public run(age: number): Promise<string> {
        return Promise.resolve("Contgratulations on graduating Highschool!");
    }
}

class College extends WorkflowStep<number, string> {
    public run(age: number): Promise<string> {
        return Promise.resolve("Contgratulations on graduating College!");
    }
}

class Retirement extends WorkflowStep<number, string> {
    public run(age: number): Promise<string> {
        return Promise.resolve("Contgratulations on retiring!");
    }
}

class UnknownAge extends WorkflowStep<number, string> {
    public run(age: number): Promise<string> {
        return Promise.resolve("Who knows...");
    }
}

class PrintAge extends WorkflowStep<string, string> {
    public run(result: string): Promise<string> {
        return Promise.resolve(result);
    }
}

/**
 * Simple age workflow example that increments an age and prints age in final step
 */
export class Workflow1 extends Workflow<string> {
    public id: string = "workflow-1"
    public version: string = "1";
    
    private _age: number = 0;

    constructor(age: number) {
        super();
        this._age = age;
    }

    public build(builder: IWorkflowBuilder<string>) {
        return builder
            .startWith(() => new Birthday(this._age))
            .if(x => x == 18)
                .do(() => new Highschool())
            .elseIf(x => x == 22)
                .do(() => new College())
            .elseIf(x => x == 60)
                .do(() => new Retirement())
            .else()
                .do(() => new UnknownAge())
            .endIf()
            .endWith(() => new PrintAge());
    }
}