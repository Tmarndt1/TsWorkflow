/**
 * WorkflowFault class is a container of a rejected value or exception. A WorkflowFault instance will be injected
 * into the appropriate workflow step.
 */
export class WorkflowFault {
    public fault: any;

    constructor(fault: any) {
        this.fault = fault;
    }
}