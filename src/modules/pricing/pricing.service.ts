import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PromoType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { PricingResult } from './pricing-result.type';
import { roundMoney, toMoneyString } from '../../common/utils/money.util';

const D = Prisma.Decimal;
const ANNUAL_DISCOUNT_RATE = new D(0.17);

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(dto: CalculatePriceDto): Promise<PricingResult> {
    const plan = await this.prisma.plan.findUnique({
      where: { code: dto.planCode },
      select: {
        code: true,
        basePriceMonthly: true,
        pricePerSeatMonthly: true,
      },
    });

    if (!plan) {
      throw new BadRequestException('Unknown plan');
    }

    const seats = dto.seats ?? 0;

    // Subtotal (monthly basis): base + seats * perSeat (if exists)
    const perSeat = plan.pricePerSeatMonthly ?? new D(0);
    const subtotal = roundMoney(plan.basePriceMonthly.add(perSeat.mul(seats)));

    const isAnnual = dto.billingPeriod === 'ANNUAL';

    // Business rule: annual discount and promo code cannot be combined.
    const annualDiscount = isAnnual
      ? roundMoney(subtotal.mul(ANNUAL_DISCOUNT_RATE))
      : new D(0);

    let promoDiscount = new D(0);
    let promoApplied: null | { code: string; type: PromoType; value: string } =
      null;

    // Promo code applies ONLY for monthly subscriptions
    if (!isAnnual && dto.promoCode) {
      const promo = await this.prisma.promoCode.findUnique({
        where: { code: dto.promoCode },
        select: {
          code: true,
          type: true,
          value: true,
          isActive: true,
          expiresAt: true,
        },
      });

      const now = new Date();
      const isExpired = promo?.expiresAt ? promo.expiresAt < now : false;

      if (!promo || !promo.isActive || isExpired) {
        throw new BadRequestException('Invalid promo code');
      }

      promoApplied = {
        code: promo.code,
        type: promo.type,
        value: promo.value.toString(),
      };

      if (promo.type === PromoType.PERCENT) {
        promoDiscount = roundMoney(subtotal.mul(promo.value.div(new D(100))));
      } else {
        promoDiscount = roundMoney(promo.value);
      }
    }

    const discountTotal = roundMoney(annualDiscount.add(promoDiscount));
    const total = roundMoney(D.max(subtotal.sub(discountTotal), new D(0)));

    return {
      planCode: dto.planCode,
      billingPeriod: dto.billingPeriod,
      seats,

      subtotal: toMoneyString(subtotal),
      discountTotal: toMoneyString(discountTotal),
      total: toMoneyString(total),

      discounts: {
        annual: toMoneyString(annualDiscount),
        promo: toMoneyString(promoDiscount),
        promoApplied,
        note:
          isAnnual && dto.promoCode
            ? 'Annual discount cannot be combined with promo codes'
            : null,
      },
    };
  }
}
