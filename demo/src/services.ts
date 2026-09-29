import type { CancellationToken } from "ts-workflow";
import { CheckoutError, type PricedOrder } from "./order.js";

export interface CheckoutServices {
    reserveInventory(order: PricedOrder, token?: CancellationToken): Promise<string>;
    authorizePayment(order: PricedOrder, token?: CancellationToken): Promise<string>;
}

const wait = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds));

/** Local simulations only; no inventory is reserved and no money is charged. */
export function createDemoServices(declinePayment = false, delayMs = 40): CheckoutServices {
    return {
        async reserveInventory(order, token) {
            await wait(delayMs);
            token?.throwIfCancelled();
            return `reservation-${order.id}`;
        },
        async authorizePayment(order, token) {
            await wait(delayMs * 1.5);
            token?.throwIfCancelled();
            if (declinePayment) throw new CheckoutError("PAYMENT_DECLINED", "The simulated payment was declined.");
            return `payment-${order.id}`;
        }
    };
}
