import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BillingPeriod } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsString()
  planCode!: string;

  @Transform(({ value }: { value: unknown }): BillingPeriod => {
    if (typeof value !== 'string') return value as BillingPeriod;

    const normalized = value.trim().toUpperCase();
    return normalized as BillingPeriod;
  })
  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @IsOptional()
  @IsInt()
  @Min(0)
  seats?: number;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
