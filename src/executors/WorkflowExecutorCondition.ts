import CancellationTokenSource from "../CancellationTokenSource";
import { IWorkflowStep, WorkflowStep } from "../WorkflowStep";
import { IWorkflowExecutor } from "./WorkflowExecutor";
import { WorkflowExecutorMoveNext } from "./WorkflowExecutorMoveNext";
import { WorkflowExecutorBase } from "./WorkflowExecutorBase";

interface ICondition {
    delay: number;
    timeout: number;
    factory: () => IWorkflowStep<unknown, unknown>;
    condition: ((args: any) => boolean);
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
            reject: false
        });
    }

    public reject(): IWorkflowExecutorConditionRejected<TInput, TOutput, TResult> {
        this.current.reject = true;

        return this;
    }
    
    public timeout(milliseconds: number): any {
        if (milliseconds < 1) throw Error("Timeout must be a postive integer");

        this.current.timeout = milliseconds;

        return this;
    }
    
    public delay(milliseconds: number): any {
        if (milliseconds < 1) throw Error("Delay must be a postive integer");

        this.current.delay = milliseconds;

        return this;
    }
    
    public do<TNext>(factory: () => IWorkflowStep<TOutput, TNext>): IWorkflowExecutorConditionIf<TInput, TOutput | TNext, TResult> {
        if (factory == null) throw new Error("Factory cannot be null");

        this.current.factory = factory;

        return this;
    }

    public endIf(): IWorkflowExecutor<void, TOutput, TResult> {
        return this.next(new WorkflowExecutorMoveNext())
    }

    public elseIf(condition: (input: TInput) => boolean): IWorkflowExecutorCondition<TInput, TOutput, TResult> {
        if (condition == null) throw new Error("Condition function cannot be null");
        
        this._branches.push({
            delay: null,
            timeout: null,
            condition: condition,
            factory: null,
            reject: false
        });

        return this;
    }

    public else(): IWorkflowExecutorConditionElse<TInput, TOutput, TResult> {        
        this._branches.push({
            delay: null,
            timeout: null,
            condition: () => true,
            factory: null,
            reject: false
        });

        return this;
    }

    public run(input: TInput, cts: CancellationTokenSource): Promise<TResult> {
        return new Promise(async (resolve, reject) => {
            let branch = this._branches.find(x => x?.condition?.(input) === true);

            try {
                if (branch.reject) reject("Workflow manually rejected");

                let delay: number | null = branch?.delay ?? 0;
                let timeout: number = branch?.timeout ?? 0;
                let expired: boolean = false;

                let delayTimeout: NodeJS.Timeout;
                let expireTimeout: NodeJS.Timeout;

                if (timeout > 0) {
                    expireTimeout = setTimeout(async () => {
                        expired = true;

                        cts.cancel();

                        if (delay != null) clearTimeout(delayTimeout);

                        reject(`Step timed out after ${branch.timeout} ms`);
                    }, branch.timeout ?? 0);
                }

                delayTimeout = setTimeout(async () => {
                    try {
                        clearInterval(expireTimeout);

                        if (expired) return reject(`Step timed out after ${branch.timeout} ms`);

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