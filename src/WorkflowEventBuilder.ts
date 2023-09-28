
import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { IWorkflowNextExtendedBuilder, IWorkflowNextBuilder, ParallelType, WorkflowNextBuilder } from "./WorkflowNextBuilder";
import { WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { IWorkflowFinalBuilder, WorkflowFinalBuilder } from "./WorkflowFinalBuilder";
import { IWorkflowParallelBuilder, WorkflowParallelBuilder } from "./WorkflowParallelBuilder";
import { WorkflowEvent, emitter } from "./Emitter";
import { Workflow, WorkflowStatus, setWorkflowStatus } from "./Workflow";

export interface IWorkflowEventBuilder<TInput, TOutput, TResult> extends IWorkflowNextBuilder<TInput, TOutput, TResult> {

}

export class WorkflowEventBuilder<TInput, TOutput, TResult> extends WorkflowStepBuilder<TInput, TOutput, TResult> implements IWorkflowEventBuilder<TInput, TOutput, TResult> {
    private _eventName: string;

    constructor(eventName: string, workflow: Workflow<any, TResult>) {
        super(workflow);

        this._eventName = eventName;
    }
    
    public wait<TNext>(eventName: string): IWorkflowNextBuilder<TInput, TNext & TOutput, TResult> {
        return new WorkflowEventBuilder(eventName, this._workflow);
    }

    public parallel<T extends (() => IWorkflowStep<any, any>)[] | []>(factories: T): IWorkflowParallelBuilder<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult> {
        if (!(factories instanceof Array)) throw Error("Steps must be an array");

        return this.next(new WorkflowParallelBuilder(factories, this._workflow));
    }

    public then<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowNextExtendedBuilder<TOutput, TNext, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");
        
        return this.next(new WorkflowNextBuilder(factory, this._workflow));
    }

    public endWith(builder: () => IWorkflowStep<TOutput, TResult>): IWorkflowFinalBuilder<TOutput, TResult> {
        if (builder == null) throw new Error("Factory cannot be null");
        
        return this.next(new WorkflowFinalBuilder(builder, this._workflow));
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        setWorkflowStatus(this._workflow, WorkflowStatus.Pending);

        return new Promise((resolve, reject) => {
            let instance = emitter();

            instance.subscribe(this, async (event: WorkflowEvent<any>) => {
                if (this._eventName !== event?.name) return;

                try {
                    setWorkflowStatus(this._workflow, WorkflowStatus.Running);

                    resolve(await this._next?.run([event, input], cts));
                } catch (error) {
                    reject(error);
                } finally {
                    instance.unsubscribe(this);   
                }
            });
        });
    }
}