import CancellationTokenSource from "../CancellationTokenSource";
import { IWorkflowStep, WorkflowStep } from "../WorkflowStep";
import { IWorkflowExecutor } from "./WorkflowExecutor";
import { WorkflowExecutorMoveNext } from "./WorkflowExecutorMoveNext";
import { WorkflowExecutorBase } from "./WorkflowExecutorBase";

enum ConditionType {
    If,
    ElseIf,
    Else
}

interface ICondition {
    delay: number | null;
    timeout: number | null;
    type: ConditionType;
    step: IWorkflowStep<unknown, unknown> | null;
    condition: ((args: any) => boolean) | null;
    reject: boolean;
}

/**
 * Interface that defines the aggregate method
 */
export interface IWorkflowExecutorConditionAggregate<TInput, TOutput, TResult> {
    /**
     * Aggregates the conditional results
     */
    endIf(): IWorkflowExecutor<void, TOutput, TResult>;
}

/**
 * Interface that defines the methods after if/do is established within a workflow
 */
export interface IWorkflowExecutorConditionElseDo<TInput, TOutput, TResult> extends IWorkflowExecutorConditionAggregate<TInput, TOutput, TResult> {
    /**
     * Delays the step
     * @param {number} milliseconds the time in milliseconds to delay the step
     */
    delay(milliseconds: number): IWorkflowExecutorConditionElseDo<TInput, TOutput, TResult>;
    /**
     * Defines the amount of time the step will timeout after
     * @param {number} milliseconds the time in milliseconds the step will timeout after
     */
    timeout(milliseconds: number): IWorkflowExecutorConditionElseDo<TInput, TOutput, TResult>;
    
}

export interface IWorkflowExecutorConditionElse<TInput, TOutput, TResult> {
    /**
     * Defines the step to run
     * @param {new () => IWorkflowStep<TInput, TNext>} factory the step to run
     */
    do<TNext>(factory: ((() => IWorkflowStep<TOutput, TNext>) | ((input: TOutput) => Promise<TNext>))): IWorkflowExecutorConditionElseDo<TInput, TOutput | TNext, TResult>;
}

/**
 * Interface that defines the methods after if/do is established within a workflow
 */
export interface IWorkflowExecutorConditionIf<TInput, TOutput, TResult> extends IWorkflowExecutorConditionAggregate<TInput, TOutput, TResult> {
    /**
     * Delays the step
     * @param {number} milliseconds the time in milliseconds to delay the step
     */
    delay(milliseconds: number): IWorkflowExecutorConditionIf<TInput, TOutput, TResult>;
    /**
     * Defines the amount of time the step will timeout after
     * @param {number} milliseconds the time in milliseconds the step will timeout after
     */
    timeout(milliseconds: number): IWorkflowExecutorConditionIf<TInput, TOutput, TResult>;
    /**
     * Conditional method that will run a step if the expression equates to true
     * @param expression The expression to evaluate
     */
    elseIf(expression: (input: TInput) => boolean): IWorkflowExecutorCondition<TInput, TOutput, TResult>;
    /**
     * Conditional method that will run if all other if conditionals don't evaluate
     */
    else(): IWorkflowExecutorConditionElse<TInput, TOutput, TResult>;
}

export interface IWorkflowExecutorConditionRejected<TInput, TOutput, TResult> {
    /**
     * Aggregates the conditional results
     */
    endIf(): IWorkflowExecutor<void, TOutput, TResult>;
    /**
     * Conditional method that will run a step if the expression equates to true
     * @param expression The expression to evaluate
     */
    elseIf(expression: (input: TInput) => boolean): IWorkflowExecutorCondition<TInput, TOutput, TResult>;
    /**
     * Conditional method that will run if all other if conditionals don't evaluate
     */
    else(): IWorkflowExecutorConditionElse<TInput, TOutput, TResult>;
}

/**
 * Interface that defines the basic methods on a conditional workflow
 */
export interface IWorkflowExecutorCondition<TInput, TOutput, TResult> {
    /**
     * If condition is true it will reject and end the workflow
     */
    reject(): IWorkflowExecutorConditionRejected<TInput, TOutput, TResult>;
    /**
     * Defines the step to run if the condition is true
     * @param {new () => IWorkflowStep<TInput, TNext>} factory the step to run if the condition is true
     */
    do<TNext>(factory: ((() => IWorkflowStep<TOutput, TNext>) | ((input: TOutput) => Promise<TNext>))): IWorkflowExecutorConditionIf<TInput, TOutput | TNext, TResult>;
}

/**
 * WorkflowExecutorCondition class provides the conditional capabilities
 */
export class WorkflowExecutorCondition<TInput, TOutput, TResult> extends WorkflowExecutorBase<TInput, TOutput, TResult> 
    implements IWorkflowExecutorCondition<TInput, TOutput, TResult>, IWorkflowExecutorConditionIf<TInput, TOutput, TResult>,
        IWorkflowExecutorConditionElse<TInput, TOutput, TResult>, IWorkflowExecutorConditionElseDo<TInput, TOutput, TResult>,
        IWorkflowExecutorConditionRejected<TInput, TOutput, TResult> {
            
    private _maps: ICondition[] = [];

    get _current(): ICondition {
        return this._maps[this._maps.length - 1];
    }

    public constructor(condition: (input: TInput) => boolean) {
        super();

        this._maps.push({
            delay: null,
            timeout: null,
            type: ConditionType.If,
            condition: condition,
            step: null,
            reject: false
        });
    }

    public reject(): IWorkflowExecutorConditionRejected<TInput, TOutput, TResult> {
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
    
    public do<TNext>(factory: ((() => IWorkflowStep<TOutput, TNext>) | ((input: TOutput) => Promise<TNext>))): IWorkflowExecutorConditionIf<TInput, TOutput | TNext, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");

        // this._current.step = factory;

        return this;
    }

    public endIf(): IWorkflowExecutor<void, TOutput, TResult> {
        return this.next(new WorkflowExecutorMoveNext())
    }

    public elseIf(expression: (input: TInput) => boolean): IWorkflowExecutorCondition<TInput, TOutput, TResult> {
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

    public else(): IWorkflowExecutorConditionElse<TInput, TOutput, TResult> {        
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

    public run(input: TInput, cts: CancellationTokenSource): Promise<TOutput> {
        return new Promise(async (resolve, reject) => {
            for (let i = 0; i < this._maps.length; i++) {
                if (this._maps[i].type === ConditionType.Else || this._maps[i].condition?.(input)) {
                    try {
                        if (this._maps[i].reject) reject("Workflow manually rejected");

                        let timeoutMessage: string = `Step timed out after ${this._maps[i].timeout} ms`;

                        let delay: number | null = null;
                        let hasTimeout: boolean = this._maps[i]?.timeout != null;
                        let hasExpired: boolean = false;
    
                        if (hasTimeout) {
                            setTimeout(async () => {
                                hasExpired = true;
    
                                cts.cancel();
    
                                if (delay != null) clearTimeout(delay);
    
                                reject(timeoutMessage);
                            }, this._maps[i].timeout ?? 0);
                        }

                        if (this._maps[i].delay != null) {
                            setTimeout(async () => {
                                let result: TOutput = await this._maps[i].step?.run(input) as TOutput;

                                if (hasExpired) return reject(timeoutMessage);

                                if (delay != null) clearTimeout(delay);
                                
                                let nextResult = await this.getNext()?.run(result, cts);

                                resolve(nextResult);       
                            }, this._maps[i].delay ?? 0);
                        } else {
                            let result: TOutput = await this._maps[i].step?.run(input) as TOutput;

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