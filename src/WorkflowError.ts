export enum WorkflowErrorCode {
    Cancelled = "CANCELLED",
    TimedOut = "TIMED_OUT",
    Expired = "EXPIRED",
    Stopped = "STOPPED"
}

/** A workflow control failure. Application errors are propagated unchanged. */
export class WorkflowError extends Error {
    public readonly name = "WorkflowError";

    public constructor(
        public readonly code: WorkflowErrorCode,
        message: string,
        public readonly milliseconds?: number
    ) {
        super(message);
    }

    public static cancelled(): WorkflowError {
        return new WorkflowError(WorkflowErrorCode.Cancelled, "The workflow was cancelled.");
    }

    public static expired(milliseconds: number): WorkflowError {
        return new WorkflowError(WorkflowErrorCode.Expired, `The workflow expired after ${milliseconds} ms.`, milliseconds);
    }

    public static stopped(): WorkflowError {
        return new WorkflowError(WorkflowErrorCode.Stopped, "The workflow manually stopped.");
    }

    public static timedOut(milliseconds: number): WorkflowError {
        return new WorkflowError(WorkflowErrorCode.TimedOut, `A workflow step timed out after ${milliseconds} ms.`, milliseconds);
    }
}
