import { defineWorkflow, type CancellationToken } from "ts-workflow";
import { CheckoutError, type Order, type PricedOrder, type Receipt } from "./order.js";
import type { CheckoutServices } from "./services.js";

function priceOrder(order: Order): PricedOrder {
    if (order.items.length === 0 || order.items.some(item =>
        !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
        !Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents < 0)) {
        throw new CheckoutError("INVALID_ORDER", "An order needs items with positive whole quantities and non-negative prices in cents.");
    }
    const subtotalCents = order.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
    if (!Number.isSafeInteger(subtotalCents)) {
        throw new CheckoutError("INVALID_ORDER", "The order total is too large.");
    }
    return { ...order, subtotalCents, discountCents: 0, totalCents: subtotalCents };
}

export type CheckoutStep = 'validate' | 'discount' | 'inventory' | 'payment' | 'receipt';

export function createCheckoutWorkflow(services: CheckoutServices, parallelTimeoutMs = 1_000,
    onOutput?: (step: CheckoutStep, value: unknown) => void, presentationDelayMs = 0) {
    const pause = async (token?: CancellationToken) => {
        if (presentationDelayMs > 0) await new Promise(resolve => setTimeout(resolve, presentationDelayMs));
        token?.throwIfCancelled();
    };
    // Demo-only inspection hook: return the original value unchanged.
    const output = <T>(step: CheckoutStep, value: T): T => {
        onOutput?.(step, value);
        return value;
    };
    return defineWorkflow<Order, Receipt>(builder => builder
        .startWith(() => ({ run: async (order, token) => {
            await pause(token);
            return output('validate', priceOrder(order));
        } }))
        .if(order => order.subtotalCents >= 10_000)
            .do(() => ({ run: async (order, token) => {
                await pause(token);
                const discountCents = Math.round(order.subtotalCents * 0.1);
                return output('discount', { ...order, discountCents, totalCents: order.subtotalCents - discountCents });
            } }))
        .endIf()
        .parallel([
            () => ({ run: async (order, token) => output('inventory', {
                order,
                reservationId: await services.reserveInventory(order, token)
            }) }),
            () => ({ run: async (order, token) => output('payment', await services.authorizePayment(order, token)) })
        ])
        .timeout(parallelTimeoutMs)
        .endWith(() => ({ run: async ([reservation, paymentId], token) => {
            await pause(token);
            return output('receipt', {
            orderId: reservation.order.id,
            subtotalCents: reservation.order.subtotalCents,
            discountCents: reservation.order.discountCents,
            totalCents: reservation.order.totalCents,
            reservationId: reservation.reservationId,
            paymentId
        }); } }))
        .expire(5_000 + presentationDelayMs * 3));
}
