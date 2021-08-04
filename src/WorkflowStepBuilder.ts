import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilderBase, WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderFinally, WorkflowStepBuilderFinally } from "./WorkflowStepBuilderFinally";

export interface IWorkflowStepBuilder<TInput, TOutput, TData> extends IWorkflowStepBuilderBase<TInput, TOutput, TData> {
    delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TData>;
    then<TNextOutput>(step: { new(): WorkflowStep<TOutput, TNextOutput, TData> }): IWorkflowStepBuilder<TOutput, TNextOutput, TData>;
    endWith(step: { new(): WorkflowStep<TOutput, void, TData> }): IWorkflowStepBuilderFinally<TOutput, TData>;
    onError(): IWorkflowStepBuilder<TInput, TOutput, TData>;
}

export interface IWorkflowStepBuilderWithErrorHandling<TInput, TOutput, TData> extends IWorkflowStepBuilder<TInput, TOutput, TData> {
    compensateWith<TNextOutput>(step: { new(): WorkflowStep<TOutput, TNextOutput, TData> }): IWorkflowStepBuilder<TOutput, TNextOutput, TData>;
}

export class WorkflowStepBuilder<TInput, TOutput, TData> extends WorkflowStepBuilderBase<TInput, TOutput, TData> implements IWorkflowStepBuilder<TInput, TOutput, TData> {
    public nextStep: WorkflowStepBuilderBase<any, any, any> = null;
    public lastStep: WorkflowStepBuilderBase<any, any, any> = null;
    public isFinal: boolean = false;
    private _currentStep: WorkflowStep<TInput, TOutput, TData> = null;

    public constructor(step: WorkflowStep<TInput, TOutput, TData>, last: WorkflowStepBuilder<any, any, any>, context: WorkflowContext<TData>) {
        super(step, last, context);
        this._currentStep = step;
        this.lastStep = last;
        this.context = context;
    }

    public delay(milliseconds: number): IWorkflowStepBuilder<TInput, TOutput, TData> {
        this.delayTime = milliseconds;

        return this;
    }

    public then<TNextOutput>(step: new () => WorkflowStep<TOutput, TNextOutput, TData>): IWorkflowStepBuilder<TOutput, TNextOutput, TData> {
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this.context);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    public endWith(step: new () => WorkflowStep<TOutput, void, TData>): IWorkflowStepBuilderFinally<TOutput, TData> {
        let stepBuiler = new WorkflowStepBuilderFinally(new step(), this, this.context);

        this.nextStep = stepBuiler;

        return stepBuiler;
    }

    public onError(): IWorkflowStepBuilder<TInput, TOutput, TData> {

        return this;
    }
    
    public run(input: TInput): Promise<TOutput> {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let output: TOutput = await this._currentStep.run(input, this.context);
                    resolve(output);
                }
                catch (error: any) {
                    // TODO: Hanlde on error
                    reject(error);
                }
            }, this.delayTime);
        });
    }
}