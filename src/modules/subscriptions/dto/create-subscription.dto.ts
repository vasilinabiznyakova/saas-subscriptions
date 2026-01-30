import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { BillingPeriod } from '@prisma/client';

export class CreateSubscriptionDto {
  // Temporary (no auth yet): pass userId directly.
  @IsUUID()
  userId!: string;

  @IsString()
  planCode!: string;

  @Transform(({ value }: { value: unknown }): BillingPeriod => {
    if (typeof value !== 'string') {
      return value as BillingPeriod;
    }

    const normalized = value.trim().toUpperCase();
    return normalized as BillingPeriod;
  })
  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  // Seats are required only for seat-based plans (e.g. Professional/Enterprise).
  // For plans without seats (e.g. Starter) we allow 0 and default to 0.
  @IsOptional()
  @IsInt()
  @Min(0)
  seats?: number;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
