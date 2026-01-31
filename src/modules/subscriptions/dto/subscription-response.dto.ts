import {
  BillingPeriod,
  PaymentProvider,
  PaymentStatus,
  PromoType,
  SubscriptionStatus,
} from '@prisma/client';

export class SubscriptionPlanDto {
  code!: string;

  /**
   * Plan base price (monthly) formatted as string with 2 decimals.
   * Stored in DB as Plan.basePriceMonthly.
   */
  basePrice!: string;

  /**
   * Price per seat (monthly) formatted as string with 2 decimals.
   * Stored in DB as Plan.pricePerSeatMonthly.
   */
  pricePerSeat!: string | null;

  includedApiCalls!: number;
}

export class SubscriptionPromoCodeDto {
  code!: string;
  type!: PromoType;
  value!: string;
}

export class SubscriptionPaymentDto {
  id!: string;
  status!: PaymentStatus;
  provider!: PaymentProvider;
  amount!: string;
  currency!: string;
  providerRef!: string | null;
  createdAt!: Date;
}

export class SubscriptionPricingDto {
  subtotal!: string;
  discountTotal!: string;
  total!: string;
}

export class SubscriptionResponseDto {
  id!: string;
  status!: SubscriptionStatus;
  billingPeriod!: BillingPeriod;
  seats!: number;
  provider!: PaymentProvider;

  plan!: SubscriptionPlanDto;
  promoCode!: SubscriptionPromoCodeDto | null;

  pricing!: SubscriptionPricingDto;

  /**
   * The most recent payment attempt (createdAt desc).
   * For MVP we expose only the latest payment in the subscription response.
   */
  payment!: SubscriptionPaymentDto | null;

  createdAt!: Date;
}
