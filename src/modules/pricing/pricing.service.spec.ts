import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, PromoType, BillingPeriod } from '@prisma/client';

import { PricingService } from './pricing.service';
import { PrismaService } from '../../database/prisma.service';

const D = Prisma.Decimal;

describe('PricingService', () => {
  let service: PricingService;

  const prismaMock = {
    plan: {
      findUnique: jest.fn(),
    },
    promoCode: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = moduleRef.get(PricingService);
  });

  it('Starter monthly, no seats extras, no discounts', async () => {
    prismaMock.plan.findUnique.mockResolvedValue({
      code: 'STARTER',
      basePriceMonthly: new D('29.99'),
      pricePerSeatMonthly: null,
      includedApiCalls: 1000,
    });

    const res = await service.calculate({
      planCode: 'STARTER',
      billingPeriod: BillingPeriod.MONTHLY,
      seats: 1,
    });

    expect(res.subtotal).toBe('29.99');
    expect(res.discountTotal).toBe('0.00');
    expect(res.total).toBe('29.99');
    expect(res.discounts.annual).toBe('0.00');
    expect(res.discounts.promo).toBe('0.00');
  });

  it('Professional monthly with seats', async () => {
    prismaMock.plan.findUnique.mockResolvedValue({
      code: 'PROFESSIONAL',
      basePriceMonthly: new D('99.49'),
      pricePerSeatMonthly: new D('15.75'),
      includedApiCalls: 10000,
    });

    const res = await service.calculate({
      planCode: 'PROFESSIONAL',
      billingPeriod: BillingPeriod.MONTHLY,
      seats: 3,
    });

    // 99.49 + 15.75*3 = 146.74
    expect(res.subtotal).toBe('146.74');
    expect(res.discountTotal).toBe('0.00');
    expect(res.total).toBe('146.74');
  });

  it('Annual applies 17% discount', async () => {
    prismaMock.plan.findUnique.mockResolvedValue({
      code: 'ENTERPRISE',
      basePriceMonthly: new D('299.90'),
      pricePerSeatMonthly: new D('12.30'),
      includedApiCalls: 100000,
    });

    const res = await service.calculate({
      planCode: 'ENTERPRISE',
      billingPeriod: BillingPeriod.ANNUAL,
      seats: 2,
    });

    // subtotal = 299.90 + 12.30*2 = 324.50
    // annual discount = 17% of 324.50 = 55.165 -> 55.17
    // total = 324.50 - 55.17 = 269.33
    expect(res.subtotal).toBe('324.50');
    expect(res.discounts.annual).toBe('55.17');
    expect(res.discountTotal).toBe('55.17');
    expect(res.total).toBe('269.33');
  });

  it('Monthly promo (percent) applies, annual+promo does not combine', async () => {
    prismaMock.plan.findUnique.mockResolvedValue({
      code: 'PROFESSIONAL',
      basePriceMonthly: new D('99.49'),
      pricePerSeatMonthly: new D('15.75'),
      includedApiCalls: 10000,
    });

    prismaMock.promoCode.findUnique.mockResolvedValue({
      code: 'WELCOME10',
      type: PromoType.PERCENT,
      value: new D('10'),
      isActive: true,
      expiresAt: null,
    });

    // monthly with promo
    const monthly = await service.calculate({
      planCode: 'PROFESSIONAL',
      billingPeriod: BillingPeriod.MONTHLY,
      seats: 1,
      promoCode: 'WELCOME10',
    });

    // subtotal = 99.49 + 15.75*1 = 115.24
    // promo 10% = 11.524 -> 11.52
    // total = 103.72
    expect(monthly.subtotal).toBe('115.24');
    expect(monthly.discounts.promo).toBe('11.52');
    expect(monthly.total).toBe('103.72');

    // annual with promo → promo ignored
    const annual = await service.calculate({
      planCode: 'PROFESSIONAL',
      billingPeriod: BillingPeriod.ANNUAL,
      seats: 1,
      promoCode: 'WELCOME10',
    });

    expect(annual.discounts.promo).toBe('0.00');
    expect(annual.discounts.promoApplied).toBeNull();
    expect(annual.discounts.note).toBe(
      'Annual discount cannot be combined with promo codes',
    );
  });

  it('throws NotFoundException on unknown promo code (monthly)', async () => {
    prismaMock.plan.findUnique.mockResolvedValue({
      code: 'STARTER',
      basePriceMonthly: new D('29.99'),
      pricePerSeatMonthly: null,
      includedApiCalls: 1000,
    });

    prismaMock.promoCode.findUnique.mockResolvedValue(null);

    await expect(
      service.calculate({
        planCode: 'STARTER',
        billingPeriod: BillingPeriod.MONTHLY,
        seats: 1,
        promoCode: 'NOPE',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException on inactive or expired promo code (monthly)', async () => {
    prismaMock.plan.findUnique.mockResolvedValue({
      code: 'STARTER',
      basePriceMonthly: new D('29.99'),
      pricePerSeatMonthly: null,
      includedApiCalls: 1000,
    });

    prismaMock.promoCode.findUnique.mockResolvedValue({
      code: 'WELCOME10',
      type: PromoType.PERCENT,
      value: new D('10'),
      isActive: false,
      expiresAt: null,
    });

    await expect(
      service.calculate({
        planCode: 'STARTER',
        billingPeriod: BillingPeriod.MONTHLY,
        seats: 1,
        promoCode: 'WELCOME10',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows seats = 0 and calculates price correctly', async () => {
    prismaMock.plan.findUnique.mockResolvedValue({
      code: 'STARTER',
      basePriceMonthly: new D('29.99'),
      pricePerSeatMonthly: null,
      includedApiCalls: 1000,
    });

    prismaMock.promoCode.findUnique.mockResolvedValue({
      code: 'WELCOME10',
      type: PromoType.PERCENT,
      value: new D('10'),
      isActive: true,
      expiresAt: null,
    });

    const res = await service.calculate({
      planCode: 'STARTER',
      billingPeriod: BillingPeriod.MONTHLY,
      seats: 0,
      promoCode: 'WELCOME10',
    });

    expect(res.subtotal).toBe('29.99');
    expect(res.discounts.promo).toBe('3.00');
    expect(res.discountTotal).toBe('3.00');
    expect(res.total).toBe('26.99');

    expect(res.discounts.promoApplied).toEqual({
      code: 'WELCOME10',
      type: PromoType.PERCENT,
      value: '10',
    });
  });
});
