import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { BillingPeriod } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { normalizeUpperString } from 'src/common/utils/transformers';

export class CalculatePriceDto {
  @ApiProperty({ example: 'STARTER' })
  @Transform(({ value }: TransformFnParams) => normalizeUpperString(value))
  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @ApiProperty({ enum: BillingPeriod, example: BillingPeriod.MONTHLY })
  @Transform(({ value }: TransformFnParams) => normalizeUpperString(value))
  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @ApiProperty({ example: 3, required: false, nullable: true })
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
  seats?: number;

  @ApiProperty({ example: 'WELCOME10', required: false, nullable: true })
  @Transform(({ value }: TransformFnParams) => normalizeUpperString(value))
  @IsOptional()
  @IsString()
  promoCode?: string;
}
