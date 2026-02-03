import {
  BillingPeriod,
  PaymentProvider,
  PaymentStatus,
  PromoType,
  SubscriptionStatus,
  Prisma,
} from '@prisma/client';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';

type DecimalLike = Prisma.Decimal | string | number;

function money(v: DecimalLike | null | undefined): string {
  if (v === null || v === undefined) return '0.00';
  if (typeof v === 'number') return v.toFixed(2);
  if (typeof v === 'string') return v;
  return v.toFixed(2); // Prisma.Decimal
}

function decimalToString(v: DecimalLike): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return v.toString(); // Prisma.Decimal
}

/**
 * Exact Prisma payload shape used for GET /subscriptions endpoints
 */
type SubscriptionModelForResponse = {
  id: string;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  seats: number;
  provider: PaymentProvider;

  priceSubtotal: DecimalLike;
  discountTotal: DecimalLike;
  priceTotal: DecimalLike;

  createdAt: Date;

  plan: {
    code: string;
    basePriceMonthly: DecimalLike;
    pricePerSeatMonthly: DecimalLike | null;
    includedApiCalls: number;
  };

  promoCode: {
    code: string;
    type: PromoType;
    value: DecimalLike;
  } | null;

  payments: Array<{
    id: string;
    status: PaymentStatus;
    provider: PaymentProvider;
    amount: DecimalLike;
    currency: string;
    providerRef: string | null;
    createdAt: Date;
  }>;
};

export function toSubscriptionResponse(
  model: SubscriptionModelForResponse,
): SubscriptionResponseDto {
  const latestPayment = model.payments?.[0] ?? null;

  return {
    id: model.id,
    status: model.status,
    billingPeriod: model.billingPeriod,
    seats: model.seats,
    provider: model.provider,

    plan: {
      code: model.plan.code,
      basePrice: money(model.plan.basePriceMonthly),
      pricePerSeat: model.plan.pricePerSeatMonthly
        ? money(model.plan.pricePerSeatMonthly)
        : null,
      includedApiCalls: model.plan.includedApiCalls,
    },

    promoCode: model.promoCode
      ? {
          code: model.promoCode.code,
          type: model.promoCode.type,
          value:
            model.promoCode.type === PromoType.PERCENT
              ? decimalToString(model.promoCode.value)
              : money(model.promoCode.value),
        }
      : null,

    pricing: {
      subtotal: money(model.priceSubtotal),
      discountTotal: money(model.discountTotal),
      total: money(model.priceTotal),
    },

    payment: latestPayment
      ? {
          id: latestPayment.id,
          status: latestPayment.status,
          provider: latestPayment.provider,
          amount: money(latestPayment.amount),
          currency: latestPayment.currency,
          providerRef: latestPayment.providerRef ?? null,
          createdAt: latestPayment.createdAt.toISOString(),
        }
      : null,

    createdAt: model.createdAt.toISOString(),
  };
}
