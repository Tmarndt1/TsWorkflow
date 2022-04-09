const CANCEL = Symbol();

/**
 * Defines the properties on a CancellationToken
 */
export interface ICancellationToken {
    /**
     * Determines if the token is cancelled
     * @returns {boolean} is cancelled result
     */
    isCancelled(): boolean;
}

/**
 * CancellationToken implementation
 */
export class CancellationToken implements ICancellationToken {
    private _cancelled: boolean = false;

    public constructor() {

    }

    /**
     * Throws an exception if the token is cancelled
     */
    public throwIfCancelled(): void {
        if (this.isCancelled()) {
            throw "Cancelled!";
        }
    }

    /**
     * Determines if the token is cancelled
     * @returns {boolean} is cancelled result
     */
    public isCancelled(): boolean {
        return this._cancelled === true;
    }

    [CANCEL]() {
        this._cancelled = true;
    }
}

/**
 * Defines the properties on a CancellationTokenSource
 */
export interface ICancellationTokenSource {
    /**
     * The CancellationTokenSource's CancellationToken
     */
    token: ICancellationToken;
    /**
     * Cancels the token
     */
    cancel(): void;
}

/**
 * CancellationTokenSource implementation
 */
export default class CancellationTokenSource implements ICancellationTokenSource {
    public token: CancellationToken;

    constructor() {
        this.token = new CancellationToken();
    }

    /**
     * Cancels the token
     */
    public cancel(): void {
        this.token[CANCEL]();
    }
}