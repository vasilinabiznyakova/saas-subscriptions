import {
  BillingPeriod,
  PaymentProvider,
  PaymentStatus,
  PromoType,
  SubscriptionStatus,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionPlanDto {
  @ApiProperty({ example: 'STARTER' })
  code!: string;

  /**
   * Plan base price (monthly) formatted as string with 2 decimals.
   * Stored in DB as Plan.basePriceMonthly.
   */
  @ApiProperty({ example: '29.99' })
  basePrice!: string;

  /**
   * Price per seat (monthly) formatted as string with 2 decimals.
   * Stored in DB as Plan.pricePerSeatMonthly.
   */
  @ApiProperty({ example: '15.75', nullable: true })
  pricePerSeat!: string | null;

  @ApiProperty({ example: 1000 })
  includedApiCalls!: number;
}

export class SubscriptionPromoCodeDto {
  @ApiProperty({ example: 'WELCOME10' })
  code!: string;

  @ApiProperty({ enum: PromoType, example: PromoType.PERCENT })
  type!: PromoType;

  /**
   * If type === PERCENT: "10" (or "10.5") as string
   * If type === FIXED: "5.00" as money string
   */
  @ApiProperty({ example: '10' })
  value!: string;
}

export class SubscriptionPaymentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.CREATED })
  status!: PaymentStatus;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.STRIPE })
  provider!: PaymentProvider;

  @ApiProperty({ example: '29.99' })
  amount!: string;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 'pi_mock_123', nullable: true })
  providerRef!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-01-31T19:53:58.100Z',
  })
  createdAt!: string;
}

export class SubscriptionPricingDto {
  @ApiProperty({ example: '115.24' })
  subtotal!: string;

  @ApiProperty({ example: '15.00' })
  discountTotal!: string;

  @ApiProperty({ example: '100.24' })
  total!: string;
}

export class SubscriptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    enum: SubscriptionStatus,
    example: SubscriptionStatus.PENDING,
  })
  status!: SubscriptionStatus;

  @ApiProperty({ enum: BillingPeriod, example: BillingPeriod.MONTHLY })
  billingPeriod!: BillingPeriod;

  @ApiProperty({ example: 3 })
  seats!: number;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.STRIPE })
  provider!: PaymentProvider;

  @ApiProperty({ type: SubscriptionPlanDto })
  plan!: SubscriptionPlanDto;

  @ApiProperty({ type: SubscriptionPromoCodeDto, nullable: true })
  promoCode!: SubscriptionPromoCodeDto | null;

  @ApiProperty({ type: SubscriptionPricingDto })
  pricing!: SubscriptionPricingDto;

  /**
   * The most recent payment attempt (createdAt desc).
   * For MVP we expose only the latest payment in the subscription response.
   */
  @ApiProperty({ type: SubscriptionPaymentDto, nullable: true })
  payment!: SubscriptionPaymentDto | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-01-31T19:53:58.100Z',
  })
  createdAt!: string;
}
