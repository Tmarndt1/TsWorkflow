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
    delay: number | null;
    timeout: number | null;
    type: ConditionType;
    step: WorkflowStep<unknown, unknown, unknown> | null;
    condition: ((args: any) => boolean) | null;
    reject: boolean;
}

/**
 * Interface that defines the aggregate method
 */
export interface IWorkflowStepBuilderConditionAggregate<TInput, TOutput, TResult, TContext> {
    /**
     * Aggregates the conditional results
     */
    endIf(): IWorkflowStepBuilderBasic<void, TOutput, TResult, TContext>;
}

/**
 * Interface that defines the methods after if/do is established within a workflow
 */
export interface IWorkflowStepBuilderConditionElseDo<TInput, TOutput, TResult, TContext> extends IWorkflowStepBuilderConditionAggregate<TInput, TOutput, TResult, TContext> {
    /**
     * Delays the step
     * @param {number} milliseconds the time in milliseconds to delay the step
     */
    delay(milliseconds: number): IWorkflowStepBuilderConditionElseDo<TInput, TOutput, TResult, TContext>;
    /**
     * Defines the amount of time the step will timeout after
     * @param {number} milliseconds the time in milliseconds the step will timeout after
     */
    timeout(milliseconds: number): IWorkflowStepBuilderConditionElseDo<TInput, TOutput, TResult, TContext>;
    
}

export interface IWorkflowStepBuilderConditionElse<TInput, TOutput, TResult, TContext> {
    /**
     * Defines the step to run
     * @param {new () => WorkflowStep<TInput, TNext, TContext>} step the step to run
     */
    do<TNext>(step: new () => WorkflowStep<TInput, TNext, TContext>): IWorkflowStepBuilderConditionElseDo<TInput, TOutput | TNext, TResult, TContext>;
}

/**
 * Interface that defines the methods after if/do is established within a workflow
 */
export interface IWorkflowStepBuilderConditionIf<TInput, TOutput, TResult, TContext> extends IWorkflowStepBuilderConditionAggregate<TInput, TOutput, TResult, TContext> {
    /**
     * Delays the step
     * @param {number} milliseconds the time in milliseconds to delay the step
     */
    delay(milliseconds: number): IWorkflowStepBuilderConditionIf<TInput, TOutput, TResult, TContext>;
    /**
     * Defines the amount of time the step will timeout after
     * @param {number} milliseconds the time in milliseconds the step will timeout after
     */
    timeout(milliseconds: number): IWorkflowStepBuilderConditionIf<TInput, TOutput, TResult, TContext>;
    /**
     * Conditional method that will run a step if the expression equates to true
     * @param expression The expression to evaluate
     */
    elseIf(expression: (input: TInput) => boolean): IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext>;
    /**
     * Conditional method that will run if all other if conditionals don't evaluate
     */
    else(): IWorkflowStepBuilderConditionElse<TInput, TOutput, TResult, TContext>;
}

export interface IWorkflowStepBuilderConditionRejected<TInput, TOutput, TResult, TContext> {
    /**
     * Aggregates the conditional results
     */
    endIf(): IWorkflowStepBuilderBasic<void, TOutput, TResult, TContext>;
    /**
     * Conditional method that will run a step if the expression equates to true
     * @param expression The expression to evaluate
     */
    elseIf(expression: (input: TInput) => boolean): IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext>;
    /**
     * Conditional method that will run if all other if conditionals don't evaluate
     */
    else(): IWorkflowStepBuilderConditionElse<TInput, TOutput, TResult, TContext>;
}

/**
 * Interface that defines the basic methods on a conditional workflow
 */
export interface IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> {
    /**
     * If condition is true it will reject and end the workflow
     */
    reject(): IWorkflowStepBuilderConditionRejected<TInput, TOutput, TResult, TContext>;
    /**
     * Defines the step to run if the condition is true
     * @param {new () => WorkflowStep<TInput, TNext, TContext>} step the step to run if the condition is true
     */
    do<TNext>(step: new () => WorkflowStep<TInput, TNext, TContext>): IWorkflowStepBuilderConditionIf<TInput, TOutput | TNext, TResult, TContext>;
}

/**
 * WorkflowStepBuilderCondition class provides the conditional capabilities
 */
export class WorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> extends WorkflowStepBuilderBase<TInput, TOutput, TResult, TContext> 
    implements IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext>, IWorkflowStepBuilderConditionIf<TInput, TOutput, TResult, TContext>,
        IWorkflowStepBuilderConditionElse<TInput, TOutput, TResult, TContext>, IWorkflowStepBuilderConditionElseDo<TInput, TOutput, TResult, TContext>,
        IWorkflowStepBuilderConditionRejected<TInput, TOutput, TResult, TContext> {
            
    private _maps: ICondition[] = [];

    private _last: WorkflowStepBuilderBase<any, TInput, TResult, TContext>;

    private _next: WorkflowStepBuilderAggregate<any, any, TResult, TContext> | null = null;

    get _current(): ICondition {
        return this._maps[this._maps.length - 1];
    }

    public constructor(last: WorkflowStepBuilderBase<any, any, TResult, TContext>, context: WorkflowContext<TContext> | null, condition: (input: TInput) => boolean) {
        super(context);
        this._last = last;
        this._context = context;

        this._maps.push({
            delay: null,
            timeout: null,
            type: ConditionType.If,
            condition: condition,
            step: null,
            reject: false
        });
    }

    public reject(): IWorkflowStepBuilderConditionRejected<TInput, TOutput, TResult, TContext> {
        this._current.reject = true;

        return this;
    }
    
    public timeout(milliseconds: number): any {
        this._current.timeout = milliseconds;

        return this;
    }
    
    public delay(milliseconds: number): any {
        this._current.delay = milliseconds;

        return this;
    }
    
    public do<TNext>(step: new () => WorkflowStep<TInput, TNext, TContext>): IWorkflowStepBuilderConditionIf<TInput, TOutput | TNext, TResult, TContext> {
        if (step == null) throw new Error("Step cannot be null");

        this._current.step = new step();

        return this;
    }

    public endIf(): IWorkflowStepBuilderBasic<void, TOutput, TResult, TContext> {
        this._next = new WorkflowStepBuilderAggregate(this, this._context);

        return this._next;
    }

    public elseIf(expression: (input: TInput) => boolean): IWorkflowStepBuilderCondition<TInput, TOutput, TResult, TContext> {
        if (expression == null) throw new Error("Expression function cannot be null");
        
        this._maps.push({
            delay: null,
            timeout: null,
            type: ConditionType.ElseIf,
            condition: expression,
            step: null,
            reject: false
        });

        return this;
    }

    public else(): IWorkflowStepBuilderConditionElse<TInput, TOutput, TResult, TContext> {        
        this._maps.push({
            delay: null,
            timeout: null,
            type: ConditionType.Else,
            condition: null,
            step: null,
            reject: false
        });

        return this;
    }

    public hasNext(): boolean {
        return this._next != null;
    }

    public getNext(): WorkflowStepBuilderBase<TOutput, any, TResult, TContext> | null{
        return this._next;
    }

    public getTimeout(): number | null {
        return this._timeout;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TOutput> {
        return new Promise(async (resolve, reject) => {
            for (let i = 0; i < this._maps.length; i++) {
                if (this._maps[i].type === ConditionType.Else || this._maps[i].condition?.(input)) {
                    try {
                        if (this._maps[i].reject) reject("Workflow manually rejected");

                        let timeoutMessage: string = `Step timed out after ${this._maps[i].timeout} ms`;

                        let timeout: NodeJS.Timeout | null = null;
                        let delay: number | null = null;
                        let hasTimeout: boolean = this._maps[i]?.timeout != null;
                        let hasExpired: boolean = false;
    
                        if (hasTimeout) {
                            timeout = setTimeout(async () => {
                                hasExpired = true;
    
                                cts.cancel();
    
                                if (delay != null) clearTimeout(delay);
    
                                reject(timeoutMessage);
                            }, this._maps[i].timeout ?? 0);
                        }

                        if (this._maps[i].delay != null) {
                            setTimeout(async () => {
                                let result: TOutput = await this._maps[i].step?.run(input, this._context) as TOutput;

                                if (hasExpired) return reject(timeoutMessage);

                                if (delay != null) clearTimeout(delay);
                                
                                let nextResult = await this.getNext()?.run(result, cts);

                                resolve(nextResult);       
                            }, this._maps[i].delay ?? 0);
                        } else {
                            let result: TOutput = await this._maps[i].step?.run(input, this._context) as TOutput;

                            if (hasExpired) return reject(timeoutMessage);

                            if (delay != null) clearTimeout(delay);
                            
                            let nextResult = await this.getNext()?.run(result, cts);

                            resolve(nextResult); 
                        }
                        
                    } catch (error) {
                        return Promise.reject(error);
                    }
                }
            }

            reject("There was an internal error");
        });
    }
}