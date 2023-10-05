export class WorkflowError {
    public static cancelled(): string {
        return "The workflow was cancelled."
    }

    public static expired(milliseconds: number): string {
        return `The workflow expired after ${milliseconds} ms.`;
    }
    
    public static stopped(): string {
        return "The workflow manually stopped.";
    }

    public static timedOut(milliseconds: number): string {
        return `A workflow step timed out after ${milliseconds} ms.`;
    }
}