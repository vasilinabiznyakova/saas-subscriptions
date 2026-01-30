import { PromoType, BillingPeriod } from '@prisma/client';

export type PricingResult = {
  planCode: string;
  billingPeriod: BillingPeriod;
  seats: number;

  subtotal: string;
  discountTotal: string;
  total: string;

  discounts: {
    annual: string;
    promo: string;
    promoApplied: null | {
      code: string;
      type: PromoType;
      value: string;
    };
    note: string | null;
  };
};
