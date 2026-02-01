import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { BillingPeriod } from '@prisma/client';

export class CreateSubscriptionDto {
  @ApiProperty({
    example: 'STARTER',
    description: 'Plan code',
  })
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'planCode must be uppercase and contain only A-Z, 0-9 and _',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  planCode: string;

  @ApiProperty({
    enum: BillingPeriod,
    example: BillingPeriod.MONTHLY,
    description: 'Billing period',
  })
  @IsEnum(BillingPeriod)
  billingPeriod: BillingPeriod;

  @ApiPropertyOptional({
    example: 3,
    minimum: 0,
    description: 'Number of seats (can be 0)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  seats?: number;

  @ApiPropertyOptional({
    example: 'WELCOME10',
    description: 'Promo code (applies only for MONTHLY)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'promoCode must be uppercase and contain only A-Z, 0-9 and _',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  promoCode?: string;
}
