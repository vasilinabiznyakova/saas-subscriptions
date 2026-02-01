import { ApiProperty } from '@nestjs/swagger';
import { BillingPeriod, PromoType } from '@prisma/client';

class PromoAppliedDto {
  @ApiProperty({ example: 'WELCOME10' })
  code!: string;

  @ApiProperty({ enum: PromoType, example: PromoType.PERCENT })
  type!: PromoType;

  @ApiProperty({ example: '10' })
  value!: string;
}

class PricingDiscountsDto {
  @ApiProperty({ example: '20.00' })
  annual!: string;

  @ApiProperty({ example: '10.00' })
  promo!: string;

  @ApiProperty({ type: PromoAppliedDto, nullable: true })
  promoApplied!: PromoAppliedDto | null;

  @ApiProperty({
    example: 'Annual discount cannot be combined with promo codes',
    nullable: true,
    required: false,
  })
  note!: string | null;
}

export class CalculatePriceResponseDto {
  @ApiProperty({ example: 'STARTER' })
  planCode!: string;

  @ApiProperty({ enum: BillingPeriod, example: BillingPeriod.MONTHLY })
  billingPeriod!: BillingPeriod;

  @ApiProperty({ example: 3 })
  seats!: number;

  @ApiProperty({ example: '120.00' })
  subtotal!: string;

  @ApiProperty({ example: '20.00' })
  discountTotal!: string;

  @ApiProperty({ example: '100.00' })
  total!: string;

  @ApiProperty({ type: PricingDiscountsDto })
  discounts!: PricingDiscountsDto;
}
