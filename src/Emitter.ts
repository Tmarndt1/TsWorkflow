import { WorkflowEventBuilder } from "./WorkflowEventBuilder";

export class Emitter {
    private _workflows: [WorkflowEventBuilder<any, any, any>, (event: WorkflowEvent<any>) => any][] = [];

    public subscribe<T extends WorkflowEventBuilder<any, any, any>>(builder: T, callback: (event: WorkflowEvent<any>) => any) {
        if (this._workflows.some(x => x[0] === builder)) return;

        this._workflows.push([builder, callback]);
    }

    public unsubscribe<T extends WorkflowEventBuilder<any, any, any>>(builder: T) {
        this._workflows = this._workflows.filter(x => x[0] !== builder);
    }

    public emit<TArgs>(event: WorkflowEvent<TArgs>) {
        for (let i = 0; i < this._workflows.length; i++) {
            this._workflows[i][1]?.(event);
        }
    }
}

let _instance = new Emitter();

export function emitter(): Emitter {
    return _instance;
}

export function emitWorkflowEvent<TArgs>(event: WorkflowEvent<TArgs>) {
    emitter().emit(event);
}

export class WorkflowEvent<TArgs> {
    public readonly name: string;
    public readonly data: TArgs;

    constructor(name: string, data: TArgs) {
        this.name = name;
        this.data = data;
    }
}