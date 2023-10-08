export interface IWorkflowFinalBuilder<TInput, TResult> {
    /**
     * Timeout for the entire workflow. If the timeout expires the workflow will be cancelled.
     * @param {number} milliseconds The number of milliseconds until the workflow expires.
     */
    expire(func: () => number): IWorkflowFinalBuilder<TInput, TResult>;

    delay(func: () => number): IWorkflowFinalBuilder<TInput, TResult>;
}
