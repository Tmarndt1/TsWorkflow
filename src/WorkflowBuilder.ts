import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

export interface IWorkflowBuilder<TContext, TResult> {
    startWith<TInput, TOutput>(step: { new(): WorkflowStep<TInput, TOutput, TContext> }): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext>;
}

export class WorkflowBuilder<TContext, TResult> implements IWorkflowBuilder<TContext, TResult> {
    private _context: WorkflowContext<TContext> = null;
    private _firstStep: WorkflowStepBuilderBase<any, any, TResult, TContext> = null;

    public constructor(context: WorkflowContext<TContext>) {
        this._context = context;
    }
    
    public startWith<TInput, TOutput>(step: { new(): WorkflowStep<TInput, TOutput, TContext> }): IWorkflowStepBuilder<TInput, TOutput, TResult, TContext> {
        let stepBuiler = new WorkflowStepBuilder(new step(), null, this._context);

        this._firstStep = stepBuiler;

        return stepBuiler;
    }

    public run(cts?: CancellationTokenSource): Promise<TResult> {
        return this._firstStep.run(null, cts);
    }
}