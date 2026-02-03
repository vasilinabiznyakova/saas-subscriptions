import { ApiProperty } from '@nestjs/swagger';
import {
  PaymentProvider,
  PaymentStatus,
  PromoType,
  SubscriptionStatus,
} from '@prisma/client';

export class PromoAppliedDto {
  @ApiProperty({ example: 'WELCOME10' })
  code!: string;

  @ApiProperty({ enum: PromoType, example: PromoType.PERCENT })
  type!: PromoType;

  @ApiProperty({ example: '10' })
  value!: string;
}

export class PricingDiscountsDto {
  @ApiProperty({
    example: '17.00',
    description: 'Annual billing discount amount (applies only for ANNUAL)',
  })
  annual!: string;

  @ApiProperty({
    example: '10.00',
    description: 'Promo discount amount (applies only for MONTHLY)',
  })
  promo!: string;

  @ApiProperty({
    type: PromoAppliedDto,
    nullable: true,
    example: { code: 'WELCOME10', type: PromoType.PERCENT, value: '10' },
    description: 'Applied promo details, if any',
  })
  promoApplied!: PromoAppliedDto | null;

  @ApiProperty({
    nullable: true,
    example: 'Annual discount cannot be combined with promo codes',
    description: 'Optional note about discount rules',
  })
  note!: string | null;
}

export class CreateSubscriptionPricingDto {
  @ApiProperty({ example: '100.00' })
  subtotal!: string;

  @ApiProperty({ example: '10.00' })
  discountTotal!: string;

  @ApiProperty({ example: '90.00' })
  total!: string;

  @ApiProperty({
    type: PricingDiscountsDto,
    description: 'Discount breakdown',
  })
  discounts!: PricingDiscountsDto;
}

export class CreateSubscriptionPaymentDto {
  @ApiProperty({ format: 'uuid' })
  paymentId!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ example: 'pi_3N8...' })
  providerRef!: string;

  @ApiProperty({ example: 'https://checkout.stripe.com/...' })
  checkoutUrl!: string;

  @ApiProperty({ example: 'req_123456' })
  idempotencyKey!: string;
}

export class CreateSubscriptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  subscriptionId!: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiProperty({ type: CreateSubscriptionPricingDto })
  pricing!: CreateSubscriptionPricingDto;

  @ApiProperty({ type: CreateSubscriptionPaymentDto })
  payment!: CreateSubscriptionPaymentDto;

  @ApiProperty({ example: false })
  idempotentReplay!: boolean;
}
