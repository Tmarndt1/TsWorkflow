import CancellationTokenSource from "./CancellationTokenSource";
import { IWorkflowStep } from "./WorkflowStep";
import { IWorkflowNextBuilder as IWorkflowNextBuilder } from "./WorkflowNextBuilder";
import { WorkflowMoveNextBuilder } from "./WorkflowMoveNextBuilder";
import { WorkflowBaseBuilder } from "./WorkflowBaseBuilder";

interface ICondition {
    delay: () => number;
    timeout: () => number;
    factory: () => IWorkflowStep<unknown, unknown>;
    condition: (args: any) => boolean;
    stop: boolean;
}

/**
 * Interface that defines the aggregate method
 */
export interface IWorkflowAggregateBuilder<TInput, TOutput, TResult> {
    /**
     * Aggregates the conditional results
     */
    endIf(): IWorkflowNextBuilder<void, TOutput, TResult>;
}

/**
 * Interface that defines the methods after if/do is established within a workflow
 */
export interface IWorkflowDoBuilder<TInput, TOutput, TResult> extends IWorkflowAggregateBuilder<TInput, TOutput, TResult> {
    /**
     * Delays the step
     * @param {number} milliseconds the time in milliseconds to delay the step
     */
    delay(func: () => number): IWorkflowDoBuilder<TInput, TOutput, TResult>;
    /**
     * Defines the amount of time the step will timeout after
     * @param {number} milliseconds the time in milliseconds the step will timeout after
     */
    timeout(func: () => number): IWorkflowDoBuilder<TInput, TOutput, TResult>;
}

export interface IWorkflowElseBuilder<TInput, TOutput, TResult> {
    /**
     * Defines the step to run
     * @param {new () => IWorkflowStep<TInput, TNext>} factory the step to run
     */
    do<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowDoBuilder<TInput, TOutput | TNext, TResult>;
}

/**
 * Interface that defines the methods after if/do is established within a workflow
 */
export interface IWorkflowIfBuilder<TInput, TOutput, TResult> extends IWorkflowAggregateBuilder<TInput, TOutput, TResult> {
    /**
     * Delays the step
     * @param {number} milliseconds the time in milliseconds to delay the step
     */
    delay(func: () => number): IWorkflowIfBuilder<TInput, TOutput, TResult>;
    /**
     * Defines the amount of time the step will timeout after
     * @param {number} milliseconds the time in milliseconds the step will timeout after
     */
    timeout(func: () => number): IWorkflowIfBuilder<TInput, TOutput, TResult>;
    /**
     * Conditional method that will run a step if the expression equates to true
     * @param expression The expression to evaluate
     */
    elseIf(expression: (input: TInput) => boolean): IWorkflowConditionBuilder<TInput, TOutput, TResult>;
    /**
     * Conditional method that will run if all other if conditionals don't evaluate
     */
    else(): IWorkflowElseBuilder<TInput, TOutput, TResult>;
}

export interface IWorkflowRejectedBuilder<TInput, TOutput, TResult> {
    /**
     * Aggregates the conditional results
     */
    endIf(): IWorkflowNextBuilder<void, TOutput, TResult>;
    /**
     * Conditional method that will run a step if the expression equates to true
     * @param expression The expression to evaluate
     */
    elseIf(expression: (input: TInput) => boolean): IWorkflowConditionBuilder<TInput, TOutput, TResult>;
    /**
     * Conditional method that will run if all other if conditionals don't evaluate
     */
    else(): IWorkflowElseBuilder<TInput, TOutput, TResult>;
}

/**
 * Interface that defines the basic methods on a conditional workflow
 */
export interface IWorkflowConditionBuilder<TInput, TOutput, TResult> {
    /**
     * If condition is true it will reject and end the workflow
     */
    stop(): IWorkflowRejectedBuilder<TInput, TOutput, TResult>;
    /**
     * Defines the step to run if the condition is true
     * @param {new () => IWorkflowStep<TInput, TNext>} factory the step to run if the condition is true
     */
    do<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowIfBuilder<TInput, TOutput | TNext, TResult>;
}

/**
 * WorkflowExecutorCondition class provides the conditional capabilities
 */
export class WorkflowConditionBuilder<TInput, TOutput, TResult> extends WorkflowBaseBuilder<TInput, TOutput, TResult> 
    implements IWorkflowConditionBuilder<TInput, TOutput, TResult>, IWorkflowIfBuilder<TInput, TOutput, TResult>,
        IWorkflowElseBuilder<TInput, TOutput, TResult>, IWorkflowDoBuilder<TInput, TOutput, TResult>,
        IWorkflowRejectedBuilder<TInput, TOutput, TResult> {
            
    private _branches: ICondition[] = [];

    get current(): ICondition {
        return this._branches[this._branches.length - 1];
    }

    public constructor(condition: (input: TInput) => boolean) {
        super();

        this._branches.push({
            delay: null,
            timeout: null,
            condition: condition,
            factory: null,
            stop: false
        });
    }

    public stop(): IWorkflowRejectedBuilder<TInput, TOutput, TResult> {
        this.current.stop = true;

        return this;
    }
    
    public timeout(func: () => number): any {
        this.current.timeout = func;

        return this;
    }
    
    public delay(func: () => number): any {
        this.current.delay = func;

        return this;
    }
    
    public do<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowIfBuilder<TInput, TOutput | TNext, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");

        this.current.factory = factory;

        return this;
    }

    public endIf(): IWorkflowNextBuilder<void, TOutput, TResult> {
        return this.next(new WorkflowMoveNextBuilder())
    }

    public elseIf(condition: (input: TInput) => boolean): IWorkflowConditionBuilder<TInput, TOutput, TResult> {
        if (condition == null) throw new Error("Condition function cannot be null");
        
        this._branches.push({
            delay: null,
            timeout: null,
            condition: condition,
            factory: null,
            stop: false
        });

        return this;
    }

    public else(): IWorkflowElseBuilder<TInput, TOutput, TResult> {        
        this._branches.push({
            delay: null,
            timeout: null,
            condition: () => true,
            factory: null,
            stop: false
        });

        return this;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return new Promise(async (resolve, reject) => {
            let branch = this._branches.find(x => x?.condition?.(input) === true);

            try {
                if (branch.stop) reject("Workflow manually rejected");

                let delay: number | null = branch?.delay?.() ?? 0;
                let timeout: number = branch?.timeout?.() ?? 0;
                let expired: boolean = false;

                let delayTimeout: NodeJS.Timeout;
                let expireTimeout: NodeJS.Timeout;

                if (timeout > 0) {
                    expireTimeout = setTimeout(async () => {
                        expired = true;

                        cts.cancel();

                        if (delay != null) clearTimeout(delayTimeout);

                        reject(`Step timed out after ${timeout} ms`);
                    }, timeout);
                }

                delayTimeout = setTimeout(async () => {
                    try {
                        clearInterval(expireTimeout);

                        if (expired) return reject(`Step timed out after ${timeout} ms`);

                        if (this.hasNext()) {
                            resolve(
                                await this.getNext()?.run(await branch.factory()?.run(input, cts.token) as TOutput, cts) as TResult
                            )
                        } else {
                            resolve(
                                await branch.factory()?.run(input, cts.token) as TResult
                            )
                        }
                    } catch (error) {
                        reject(error);
                    }
                }, delay);                
            } catch (error) {
                return Promise.reject(error);
            }
        });
    }
}