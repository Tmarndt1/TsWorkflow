import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";

export interface IWorkflowStepBuilder<TInput, TOutput, TData> {
    delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TData>;
    then<TNextOutput>(step: { new(): WorkflowStep<TOutput, TNextOutput, TData> }): IWorkflowStepBuilder<TOutput, TNextOutput, TData>;
    endWith(step: { new(): WorkflowStep<TOutput, void, TData> }): IWorkflowStepBuilder<TOutput, void, TData>;
    onError(): IWorkflowStepBuilder<TInput, TOutput, TData>;
}

export class WorkflowStepBuilder<TInput, TOutput, TData> implements IWorkflowStepBuilder<TInput, TOutput, TData> {
    public nextStep: WorkflowStepBuilder<any, any, any> = null;
    public lastStep: WorkflowStepBuilder<any, any, any> = null;
    public isFinal: boolean = false;
    private _context: WorkflowContext<TData> = null;
    private _currentStep: WorkflowStep<TInput, TOutput, TData> = null;
    private _delay: number = 0;

    public constructor(step: WorkflowStep<TInput, TOutput, TData>, last: WorkflowStepBuilder<any, any, any>, context: WorkflowContext<TData>) {
        this._currentStep = step;
        this.lastStep = last;
        this._context = context;
    }

    public delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TData> {
        this._delay = milliseconds;

        return this;
    }

    public then<TNextOutput>(step: new () => WorkflowStep<TOutput, TNextOutput, TData>): IWorkflowStepBuilder<TOutput, TNextOutput, TData> {
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this._context);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    public endWith(step: new () => WorkflowStep<TOutput, void, TData>): IWorkflowStepBuilder<TOutput, void, TData> {
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this._context);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    public onError(): IWorkflowStepBuilder<TInput, TOutput, TData> {
        throw new Error("Method not implemented.");
    }
    
    public run(input: TInput): Promise<TOutput> {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let output: TOutput = await this._currentStep.run(input, this._context);
                    resolve(output);
                }
                catch (error: any) {
                    // TODO: Hanlde on error
                    reject(error);
                }
            }, this._delay);
        });
    }
}