import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilder, IWorkflowStepBuilderBasic, ParallelType, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";
import { IWorkflowStepBuilderCondition, WorkflowStepBuilderCondition } from "./WorkflowStepBuilderCondition";
import { IWorkflowStepBuilderFinal, WorkflowStepBuilderFinal } from "./WorkflowStepBuilderFinal";
import { IWorkflowStepBuilderParallel, WorkflowStepBuilderParallel } from "./WorkflowStepBuilderParallel";


export class WorkflowStepBuilderAggregate<TInput, TOutput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> implements IWorkflowStepBuilderBasic<TInput, TOutput, TResult, TContext> {
    private _last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>;
    private _next: WorkflowStepBuilderBase<TOutput, any, TResult, TContext> | null = null;

    public constructor(last: WorkflowStepBuilderBase<any, any, TResult, TContext>, context: WorkflowContext<TContext> | null) {
        super(context);
        this._last = last;
        this._context = context;
    }

    public parallel<T extends (new () => WorkflowStep<any, any, TContext>)[] | []>(steps: T): IWorkflowStepBuilderParallel<TOutput, { -readonly [P in keyof T]: ParallelType<T[P]> }, TResult, TContext> {
        if (!(steps instanceof Array)) throw Error("Steps must be an array");

        let instances = (steps as Array<new () => WorkflowStep<TInput, any, TContext>>).map(step => new step());

        let parallel = new WorkflowStepBuilderParallel(instances, this, this._context);

        this._next = parallel;

        return parallel as any;
    }

    public if(expression: (output: TOutput) => boolean): IWorkflowStepBuilderCondition<TOutput, TOutput, TResult, TContext> {
        if (expression == null) throw new Error("Expression function cannot be null");
        
        let stepBuiler = new WorkflowStepBuilderCondition<TOutput, TOutput, TResult, TContext>(this, this._context, expression);

        this._next = stepBuiler;

        return stepBuiler;
    }

    public then<TNext>(step: new () => WorkflowStep<TOutput, TNext, TContext>): IWorkflowStepBuilder<TOutput, TNext, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilder(new step(), this, this._context);

        this._next = stepBuiler;

        return stepBuiler;
    }

    public endWith(step: new () => WorkflowStep<TOutput, TResult, TContext>): IWorkflowStepBuilderFinal<TOutput, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");
        
        let stepBuiler = new WorkflowStepBuilderFinal(new step(), this, this._context);

        this._next = stepBuiler;

        return stepBuiler;
    }

    public hasNext(): boolean {
        return this._next != null;
    }

    public getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext> | null {
        return this._next;
    }

    public getTimeout(): number | null {
        return this._timeout;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TOutput> {
        return this._next?.run(input as any, cts) ?? Promise.reject("Internal error in workflow");
    }
}