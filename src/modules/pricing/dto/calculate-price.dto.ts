import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { BillingPeriod } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

function normalizeUpperString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class CalculatePriceDto {
  @ApiProperty({ example: 'STARTER' })
  @Transform(({ value }: TransformFnParams) => normalizeUpperString(value))
  @IsString()
  planCode!: string;

  @ApiProperty({ enum: BillingPeriod, example: BillingPeriod.MONTHLY })
  @Transform(({ value }: TransformFnParams) => normalizeUpperString(value))
  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @ApiProperty({ example: 3, required: false, nullable: true })
  @Transform(({ value }: TransformFnParams) => {
    // allow seats to be omitted -> default 0 (чтобы не падать)
    if (value === undefined || value === null || value === '') return 0;

    // accept numeric strings like "3"
    if (typeof value === 'string') {
      const n = Number(value.trim());
      return Number.isFinite(n) ? n : value;
    }

    // leave numbers as-is; other types will be rejected by validators
    return value;
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
