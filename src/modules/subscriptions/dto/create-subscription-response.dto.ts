import {
  PaymentProvider,
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PricingResult } from '../../pricing/pricing-result.type';

export class CreateSubscriptionPaymentDto {
  paymentId!: string;
  status!: PaymentStatus;
  providerRef!: string;
  checkoutUrl!: string;
  idempotencyKey!: string;
}

export class CreateSubscriptionPricingDto {
  subtotal!: string;
  discountTotal!: string;
  total!: string;
  discounts!: PricingResult['discounts'];
}

export class CreateSubscriptionResponseDto {
  subscriptionId!: string;
  status!: SubscriptionStatus;
  provider!: PaymentProvider;

  pricing!: CreateSubscriptionPricingDto;
  payment!: CreateSubscriptionPaymentDto;

  idempotentReplay!: boolean;
}
