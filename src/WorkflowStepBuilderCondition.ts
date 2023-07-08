import CancellationTokenSource from "./CancellationTokenSource";
import { WorkflowStep } from "./WorkflowStep";
import { IWorkflowStepBuilderBasic } from "./WorkflowStepBuilder";
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
    step: WorkflowStep<unknown, unknown> | null;
    condition: ((args: any) => boolean) | null;
    reject: boolean;
}

/**
 * Interface that defines the aggregate method
 */
export interface IWorkflowStepBuilderConditionAggregate<TInput, TOutput, TResult> {
    /**
     * Aggregates the conditional results
     */
    endIf(): IWorkflowStepBuilderBasic<void, TOutput, TResult>;
}

/**
 * Interface that defines the methods after if/do is established within a workflow
 */
export interface IWorkflowStepBuilderConditionElseDo<TInput, TOutput, TResult> extends IWorkflowStepBuilderConditionAggregate<TInput, TOutput, TResult> {
    /**
     * Delays the step
     * @param {number} milliseconds the time in milliseconds to delay the step
     */
    delay(milliseconds: number): IWorkflowStepBuilderConditionElseDo<TInput, TOutput, TResult>;
    /**
     * Defines the amount of time the step will timeout after
     * @param {number} milliseconds the time in milliseconds the step will timeout after
     */
    timeout(milliseconds: number): IWorkflowStepBuilderConditionElseDo<TInput, TOutput, TResult>;
    
}

export interface IWorkflowStepBuilderConditionElse<TInput, TOutput, TResult> {
    /**
     * Defines the step to run
     * @param {new () => WorkflowStep<TInput, TNext>} step the step to run
     */
    do<TNext>(step: () => WorkflowStep<TInput, TNext>): IWorkflowStepBuilderConditionElseDo<TInput, TOutput | TNext, TResult>;
}

/**
 * Interface that defines the methods after if/do is established within a workflow
 */
export interface IWorkflowStepBuilderConditionIf<TInput, TOutput, TResult> extends IWorkflowStepBuilderConditionAggregate<TInput, TOutput, TResult> {
    /**
     * Delays the step
     * @param {number} milliseconds the time in milliseconds to delay the step
     */
    delay(milliseconds: number): IWorkflowStepBuilderConditionIf<TInput, TOutput, TResult>;
    /**
     * Defines the amount of time the step will timeout after
     * @param {number} milliseconds the time in milliseconds the step will timeout after
     */
    timeout(milliseconds: number): IWorkflowStepBuilderConditionIf<TInput, TOutput, TResult>;
    /**
     * Conditional method that will run a step if the expression equates to true
     * @param expression The expression to evaluate
     */
    elseIf(expression: (input: TInput) => boolean): IWorkflowStepBuilderCondition<TInput, TOutput, TResult>;
    /**
     * Conditional method that will run if all other if conditionals don't evaluate
     */
    else(): IWorkflowStepBuilderConditionElse<TInput, TOutput, TResult>;
}

export interface IWorkflowStepBuilderConditionRejected<TInput, TOutput, TResult> {
    /**
     * Aggregates the conditional results
     */
    endIf(): IWorkflowStepBuilderBasic<void, TOutput, TResult>;
    /**
     * Conditional method that will run a step if the expression equates to true
     * @param expression The expression to evaluate
     */
    elseIf(expression: (input: TInput) => boolean): IWorkflowStepBuilderCondition<TInput, TOutput, TResult>;
    /**
     * Conditional method that will run if all other if conditionals don't evaluate
     */
    else(): IWorkflowStepBuilderConditionElse<TInput, TOutput, TResult>;
}

/**
 * Interface that defines the basic methods on a conditional workflow
 */
export interface IWorkflowStepBuilderCondition<TInput, TOutput, TResult> {
    /**
     * If condition is true it will reject and end the workflow
     */
    reject(): IWorkflowStepBuilderConditionRejected<TInput, TOutput, TResult>;
    /**
     * Defines the step to run if the condition is true
     * @param {new () => WorkflowStep<TInput, TNext>} builder the step to run if the condition is true
     */
    do<TNext>(builder: () => WorkflowStep<TInput, TNext>): IWorkflowStepBuilderConditionIf<TInput, TOutput | TNext, TResult>;
}

/**
 * WorkflowStepBuilderCondition class provides the conditional capabilities
 */
export class WorkflowStepBuilderCondition<TInput, TOutput, TResult> extends WorkflowStepBuilderBase<TInput, TOutput, TResult> 
    implements IWorkflowStepBuilderCondition<TInput, TOutput, TResult>, IWorkflowStepBuilderConditionIf<TInput, TOutput, TResult>,
        IWorkflowStepBuilderConditionElse<TInput, TOutput, TResult>, IWorkflowStepBuilderConditionElseDo<TInput, TOutput, TResult>,
        IWorkflowStepBuilderConditionRejected<TInput, TOutput, TResult> {
            
    private _maps: ICondition[] = [];

    get _current(): ICondition {
        return this._maps[this._maps.length - 1];
    }

    public constructor(last: WorkflowStepBuilderBase<any, any, TResult>, condition: (input: TInput) => boolean) {
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

    public reject(): IWorkflowStepBuilderConditionRejected<TInput, TOutput, TResult> {
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
    
    public do<TNext>(builder: () => WorkflowStep<TInput, TNext>): IWorkflowStepBuilderConditionIf<TInput, TOutput | TNext, TResult> {
        if (builder == null) throw new Error("Factory cannot be null");

        this._current.step = builder();

        return this;
    }

    public endIf(): IWorkflowStepBuilderBasic<void, TOutput, TResult> {
        return this.next(new WorkflowStepBuilderAggregate(this))
    }

    public elseIf(expression: (input: TInput) => boolean): IWorkflowStepBuilderCondition<TInput, TOutput, TResult> {
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

    public else(): IWorkflowStepBuilderConditionElse<TInput, TOutput, TResult> {        
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