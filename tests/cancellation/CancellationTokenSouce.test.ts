import CancellationTokenSource, { ICancellationTokenSource } from '../../src/CancellationTokenSource';

describe('CancellationToken', () => {
    let cts: CancellationTokenSource;

    beforeEach(() => {
        cts = new CancellationTokenSource();
    });

    it('should not be cancelled initially', () => {
        expect(cts.token.isCancelled()).toBe(false);
    });

    it('should throw an exception when cancelled', () => {
        expect(() => {
            cts.cancel();
            cts.token.throwIfCancelled();
        }).toThrow('Cancelled!');
    });

    it('should be cancelled after calling cancel', () => {
        cts.cancel();
        expect(cts.token.isCancelled()).toBe(true);
    });
});

describe('CancellationTokenSource', () => {
        let cancellationTokenSource: ICancellationTokenSource;

    beforeEach(() => {
        cancellationTokenSource = new CancellationTokenSource();
    });

    it('should have an associated token', () => {
        expect(cancellationTokenSource.token).toBeDefined();
        expect(cancellationTokenSource.token.isCancelled()).toBe(false);
    });

    it('should cancel the associated token', () => {
        cancellationTokenSource.cancel();
        expect(cancellationTokenSource.token.isCancelled()).toBe(true);
    });
});
