const CANCEL = Symbol();

export class CancellationToken {
    private _cancelled: boolean = false;

    public constructor() {

    }

    public throwIfCancelled() {
        if (this.isCancelled()) {
            throw "Cancelled!";
        }
    }

    public isCancelled() {
        return this._cancelled === true;
    }

    [CANCEL]() {
        this._cancelled = true;
    }
}

export default class CancellationTokenSource {
    public token: CancellationToken;

    constructor() {
        this.token = new CancellationToken();
    }
  
    public cancel() {
        this.token[CANCEL]();
    }
  
}