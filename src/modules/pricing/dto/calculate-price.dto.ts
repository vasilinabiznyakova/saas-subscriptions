import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BillingPeriod } from '@prisma/client';

export class CalculatePriceDto {
  @IsString()
  planCode!: string;

  @Transform(({ value }: TransformFnParams): BillingPeriod => {
    if (typeof value !== 'string') {
      return value;
    }
    return value.toUpperCase() as BillingPeriod;
  })
  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @IsInt()
  @Min(1)
  seats!: number;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
