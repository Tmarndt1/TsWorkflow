export interface Order {
    id: string;
    items: { sku: string; quantity: number; unitPriceCents: number }[];
}

export interface PricedOrder extends Order {
    subtotalCents: number;
    discountCents: number;
    totalCents: number;
}

export interface Receipt {
    orderId: string;
    subtotalCents: number;
    discountCents: number;
    totalCents: number;
    reservationId: string;
    paymentId: string;
}

export class CheckoutError extends Error {
    public readonly name = "CheckoutError";

    public constructor(public readonly code: "INVALID_ORDER" | "PAYMENT_DECLINED", message: string) {
        super(message);
    }
}
