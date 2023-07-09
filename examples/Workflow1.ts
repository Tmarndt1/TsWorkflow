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

class PrintAge extends WorkflowStep<string[], string> {
    public run(result: string[]): Promise<string> {
        return Promise.resolve(result[0]);
    }
}

export class Workflow1 extends Workflow<string> {    
    private _age: number = 0;
    private _expiration: number = 0;
    private _timeout: number = 0;

    constructor(age: number, expiration: number, timeout: number) {
        super();

        this._age = age;
        this._expiration = expiration;
        this._timeout = timeout;
    }

    public build(builder: IWorkflowBuilder<string>) {
        return builder
            .startWith(() => new Birthday(this._age))
                .if(x => x == 18)
                    .do(() => new Highschool())
                        .timeout(() => this._timeout)
                .elseIf(x => x == 22)
                    .do(() => new College())
                        .timeout(() => this._timeout)
                .elseIf(x => x == 60)
                    .do(() => new Retirement())
                        .timeout(() => this._timeout)
                .else()
                    .do(() => new UnknownAge())
                        .timeout(() => this._timeout)
                .endIf()
                    .parallel([
                        () => {
                            return {
                                run: (input) => Promise.resolve(input)
                            }
                        }
                    ])
            .endWith(() => new PrintAge())
            .expire(() => this._expiration);
    }
}