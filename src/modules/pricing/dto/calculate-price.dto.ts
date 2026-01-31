import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BillingPeriod } from '@prisma/client';

export class CalculatePriceDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : '',
  )
  @IsString()
  planCode!: string;

  @Transform(({ value }: TransformFnParams): BillingPeriod => {
    if (typeof value !== 'string') return value as BillingPeriod;
    return value.trim().toUpperCase() as BillingPeriod;
  })
  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @IsInt()
  @Min(0)
  seats!: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  promoCode?: string;
}
