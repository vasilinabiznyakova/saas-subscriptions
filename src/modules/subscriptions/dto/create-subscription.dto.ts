import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { BillingPeriod } from '@prisma/client';

import { normalizeUpperString } from '../../../common/utils/transformers';

export class CreateSubscriptionDto {
  @ApiProperty({
    example: 'STARTER',
    description: 'Plan code',
  })
  @Transform(({ value }: TransformFnParams) => normalizeUpperString(value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'planCode must be uppercase and contain only A-Z, 0-9 and _',
  })
  planCode!: string;

  @ApiProperty({
    enum: BillingPeriod,
    example: BillingPeriod.MONTHLY,
    description: 'Billing period',
  })
  @Transform(({ value }: TransformFnParams) => normalizeUpperString(value))
  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @ApiPropertyOptional({
    example: 3,
    minimum: 0,
    description: 'Number of seats (can be 0)',
  })
  @Transform(({ value }: TransformFnParams) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;

    const n =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value.trim())
          : NaN;

    return Number.isFinite(n) ? n : undefined;
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
  @Transform(({ value }: TransformFnParams) => normalizeUpperString(value))
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'promoCode must be uppercase and contain only A-Z, 0-9 and _',
  })
  promoCode?: string;
}
