import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowContext } from "./WorkflowContext";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilderBasic, WorkflowStepBuilder } from "./WorkflowStepBuilder";
import { WorkflowStepBuilderAggregate } from "./WorkflowStepBuilderAggregate";
import { WorkflowStepBuilderBase } from "./WorkflowStepBuilderBase";

enum ConditionType {
    If,
    ElseIf,
    Else
}

interface ICondition {
    type: ConditionType,
    condition: (args: any) => boolean;
    step: WorkflowStep<unknown, unknown, unknown>;
}

/**
 * Interface that defines the methods after if/do is established within a workflow
 */
export interface IWorkflowStepBuilderConditionIf<TInput, TOutput, TResult, TContext> {
    /**
     * Conditional method that will run a step if the expression equates to true
     * @param expression The expression to evaluate
     */
    elseIf(expression: (input: TInput) => boolean): IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext>;
    /**
     * 
     * @param expression 
     */
    else(): IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext>;
    /**
     * Aggregates the conditional results
     */
    aggregate(): IWorkflowStepBuilderBasic<void, TOutput, TResult, TContext>;
}

/**
 * Interface that defines the basic methods on a conditional workflow
 */
export interface IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> {
    do<TNext>(step: new () => WorkflowStep<TInput, TNext, TContext>): IWorkflowStepBuilderConditionIf<TInput, TOutput | TNext, TResult, TContext>;
}

/**
 * WorkflowStepBuilderCondition class provides the conditional capabilities
 */
export class WorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> 
    implements IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext>, IWorkflowStepBuilderConditionIf<TInput, TOutput, TResult, TContext> {
            
    private _maps: ICondition[] = [];

    private _last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>;

    private _next: WorkflowStepBuilderAggregate<any, any, TResult, TContext>;

    get _current(): ICondition {
        return this._maps[this._maps.length - 1];
    }

    public constructor(last: WorkflowStepBuilderBase<any, any, TResult, TContext>, context: WorkflowContext<TContext>, condition: (input: TInput) => boolean) {
        super(context);
        this._last = last;
        this._context = context;
        this._maps.push({
            type: ConditionType.If,
            condition: condition,
            step: null
        });
    }
    
    public do<TNext>(step: new () => WorkflowStep<TInput, TNext, TContext>): IWorkflowStepBuilderConditionIf<TInput, TOutput | TNext, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");

        this._current.step = new step();

        return this;
    }

    public aggregate(): IWorkflowStepBuilderBasic<void, TOutput, TResult, TContext> {
        this._next = new WorkflowStepBuilderAggregate(this, this._context);

        return this._next;
    }

    public elseIf(expression: (input: TInput) => boolean): IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> {
        if (expression == null) throw new Error("Expression function cannot be null");
        
        this._maps.push({
            type: ConditionType.ElseIf,
            condition: expression,
            step: null
        });

        return this;
    }

    public else(): IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> {        
        this._maps.push({
            type: ConditionType.Else,
            condition: null,
            step: null
        });

        return this;
    }

    public hasNext(): boolean {
        return this._next != null;
    }

    public getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext> {
        return this._next;
        
    }

    public getTimeout(): number | null {
        return this._timeout;
    }

    public async run(input: TInput, cts: CancellationTokenSource): Promise<TOutput> {
        for (let i = 0; i < this._maps.length; i++) {
            if (this._maps[i].type === ConditionType.Else || this._maps[i].condition != null && this._maps[i].condition(input)) {
                try {
                    let result: TOutput = await this._maps[i].step.run(input, this._context) as TOutput;

                    return this.getNext().run(result, cts);
                } catch (error) {
                    return Promise.reject(error);
                }
            } else {
                return Promise.reject("There was an internal error");
            }
        }
    }
}