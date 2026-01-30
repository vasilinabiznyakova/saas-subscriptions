import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingPeriod,
  Prisma,
  PaymentProvider as ProviderEnum,
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../users/users.service';
import { PricingService } from '../pricing/pricing.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { PricingResult } from '../pricing/pricing-result.type';
import { createPaymentProvider } from '../payments/payment-provider.factory';
import { logMeta } from '../../common/utils/logger.utils';

function hasUniqueTarget(target: unknown, field: string): target is string[] {
  return (
    Array.isArray(target) &&
    target.every((v) => typeof v === 'string') &&
    target.includes(field)
  );
}

function providerEnumByRegion(region: string): ProviderEnum {
  if (region === 'UA') return ProviderEnum.MONOBANK;
  if (region === 'BR') return ProviderEnum.PIX;
  return ProviderEnum.STRIPE;
}

function checkoutUrlFromProviderRef(
  provider: ProviderEnum,
  providerRef: string,
): string {
  switch (provider) {
    case ProviderEnum.MONOBANK:
      return `https://mock.monobank/checkout/${providerRef}`;
    case ProviderEnum.PIX:
      return `https://mock.pix/checkout/${providerRef}`;
    default:
      return `https://mock.stripe/checkout/${providerRef}`;
  }
}

type ReplayPayment = {
  id: string;
  status: PaymentStatus;
  provider: ProviderEnum;
  providerRef: string;
  idempotencyKey: string;
  subscription: {
    id: string;
    status: SubscriptionStatus;
    provider: ProviderEnum;
    billingPeriod: BillingPeriod;
    seats: number;
    planCode: string;
    promoCode?: string;
  };
};

export type CreateSubscriptionResponse = {
  subscriptionId: string;
  status: SubscriptionStatus;
  provider: ProviderEnum;
  price: {
    subtotal: string;
    discountTotal: string;
    total: string;
    discounts: PricingResult['discounts'];
  };
  payment: {
    paymentId: string;
    status: PaymentStatus;
    providerRef: string;
    checkoutUrl: string;
    idempotencyKey: string;
  };
  idempotentReplay: boolean;
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly pricingService: PricingService,
  ) {}

  private readonly replayPaymentArgs =
    Prisma.validator<Prisma.PaymentDefaultArgs>()({
      include: {
        subscription: {
          include: {
            plan: true,
            promoCode: true,
          },
        },
      },
    });

  private async findPaymentByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<ReplayPayment | null> {
    type ReplayPaymentDb = Prisma.PaymentGetPayload<
      typeof this.replayPaymentArgs
    >;

    const p: ReplayPaymentDb | null = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
      ...this.replayPaymentArgs,
    });

    if (!p) return null;
    if (!p.idempotencyKey) return null;

    return {
      id: p.id,
      status: p.status,
      provider: p.provider,
      providerRef: p.providerRef,
      idempotencyKey: p.idempotencyKey,
      subscription: {
        id: p.subscription.id,
        status: p.subscription.status,
        provider: p.subscription.provider,
        billingPeriod: p.subscription.billingPeriod,
        seats: p.subscription.seats,
        planCode: p.subscription.plan.code,
        promoCode: p.subscription.promoCode?.code ?? undefined,
      },
    };
  }

  private buildResponse(params: {
    subscriptionId: string;
    status: SubscriptionStatus;
    provider: ProviderEnum;
    pricing: PricingResult;
    payment: {
      id: string;
      status: PaymentStatus;
      providerRef: string;
      provider: ProviderEnum;
      idempotencyKey: string;
      checkoutUrl: string;
    };
    idempotentReplay: boolean;
  }): CreateSubscriptionResponse {
    return {
      subscriptionId: params.subscriptionId,
      status: params.status,
      provider: params.provider,
      price: {
        subtotal: params.pricing.subtotal,
        discountTotal: params.pricing.discountTotal,
        total: params.pricing.total,
        discounts: params.pricing.discounts,
      },
      payment: {
        paymentId: params.payment.id,
        status: params.payment.status,
        providerRef: params.payment.providerRef,
        checkoutUrl: params.payment.checkoutUrl,
        idempotencyKey: params.payment.idempotencyKey,
      },
      idempotentReplay: params.idempotentReplay,
    };
  }

  private async buildReplayResponse(
    existingPayment: ReplayPayment,
  ): Promise<CreateSubscriptionResponse> {
    const s = existingPayment.subscription;

    const pricing = await this.pricingService.calculate({
      planCode: s.planCode,
      billingPeriod: s.billingPeriod,
      seats: s.seats,
      promoCode: s.promoCode,
    });

    this.logger.warn(
      `Idempotent replay detected, ${logMeta({
        idempotencyKey: existingPayment.idempotencyKey,
        subscriptionId: s.id,
        paymentId: existingPayment.id,
        provider: existingPayment.provider,
      })}`,
    );

    return this.buildResponse({
      subscriptionId: s.id,
      status: s.status,
      provider: s.provider,
      pricing,
      payment: {
        id: existingPayment.id,
        status: existingPayment.status,
        providerRef: existingPayment.providerRef,
        provider: existingPayment.provider,
        idempotencyKey: existingPayment.idempotencyKey,
        checkoutUrl: checkoutUrlFromProviderRef(
          existingPayment.provider,
          existingPayment.providerRef,
        ),
      },
      idempotentReplay: true,
    });
  }

  /**
   * Idempotency-Key required
   *subscription(PENDING) + payment(CREATED) in 1 trx
   * race-safe (P2002 -> replay)
   */
  async create(
    dto: CreateSubscriptionDto,
    idempotencyKey: string,
  ): Promise<CreateSubscriptionResponse> {
    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    this.logger.log(
      'Create subscription request',
      logMeta({
        userId: dto.userId,
        planCode: dto.planCode,
        billingPeriod: dto.billingPeriod,
        seats: dto.seats ?? 0,
        promoCode: dto.promoCode ?? null,
        idempotencyKey,
      }),
    );

    // idempotency early-return
    const existing = await this.findPaymentByIdempotencyKey(idempotencyKey);
    if (existing) return this.buildReplayResponse(existing);

    const user = await this.usersService.findById(dto.userId);
    if (!user) throw new NotFoundException('User not found');

    const pricing = await this.pricingService.calculate({
      planCode: dto.planCode,
      billingPeriod: dto.billingPeriod,
      seats: dto.seats ?? 0,
      promoCode: dto.promoCode,
    });

    this.logger.log(
      'Pricing calculated',
      logMeta({
        planCode: dto.planCode,
        billingPeriod: dto.billingPeriod,
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountTotal,
        total: pricing.total,
        discounts: pricing.discounts,
      }),
    );

    const providerEnum = providerEnumByRegion(user.region);
    const providerClient = createPaymentProvider(user.region);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const subscription = await tx.subscription.create({
          data: {
            user: { connect: { id: user.id } },

            plan: { connect: { code: dto.planCode } },
            promoCode: dto.promoCode
              ? { connect: { code: dto.promoCode } }
              : undefined,

            billingPeriod: dto.billingPeriod,
            seats: dto.seats ?? 0,
            status: SubscriptionStatus.PENDING,
            provider: providerEnum,

            priceSubtotal: new Prisma.Decimal(pricing.subtotal),
            discountTotal: new Prisma.Decimal(pricing.discountTotal),
            priceTotal: new Prisma.Decimal(pricing.total),
          },
        });

        const paymentInit = await providerClient.initPayment({
          amount: pricing.total,
          currency: 'USD',
        });

        const payment = await tx.payment.create({
          data: {
            subscriptionId: subscription.id,
            provider: providerEnum,
            status: PaymentStatus.CREATED,
            amount: new Prisma.Decimal(pricing.total),
            currency: 'USD',
            providerRef: paymentInit.providerRef,
            idempotencyKey, // ✅ unique
          },
        });

        return { subscription, payment, checkoutUrl: paymentInit.checkoutUrl };
      });

      this.logger.log(
        'Subscription and payment created',
        logMeta({
          subscriptionId: result.subscription.id,
          paymentId: result.payment.id,
          provider: result.payment.provider,
          amount: pricing.total,
          idempotencyKey,
        }),
      );

      return this.buildResponse({
        subscriptionId: result.subscription.id,
        status: result.subscription.status,
        provider: result.subscription.provider,
        pricing,
        payment: {
          id: result.payment.id,
          status: result.payment.status,
          providerRef: result.payment.providerRef,
          provider: result.payment.provider,
          idempotencyKey: result.payment.idempotencyKey,
          checkoutUrl:
            result.checkoutUrl ??
            checkoutUrlFromProviderRef(
              result.payment.provider,
              result.payment.providerRef,
            ),
        },
        idempotentReplay: false,
      });
    } catch (e) {
      //race-safe idempotency: unique violation по idempotency_key -> replay
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002' &&
        hasUniqueTarget(
          (e.meta as { target?: unknown } | undefined)?.target,
          'idempotency_key',
        )
      ) {
        this.logger.warn(
          'Idempotency unique constraint hit (race-safe replay)',
          logMeta({
            idempotencyKey,
          }),
        );

        const existing2 =
          await this.findPaymentByIdempotencyKey(idempotencyKey);
        if (existing2) return this.buildReplayResponse(existing2);
      }

      this.logger.error(
        'Failed to create subscription',
        logMeta({
          idempotencyKey,
          userId: dto.userId,
          error: e instanceof Error ? e.message : String(e),
        }),
      );

      throw e;
    }
  }

  //temporary pass userId strict later replace to req.user.id)
  private readonly subscriptionDetailsArgs =
    Prisma.validator<Prisma.SubscriptionDefaultArgs>()({
      include: { payments: true, plan: true, promoCode: true },
    });

  findAll(
    userId: string,
  ): Promise<
    Prisma.SubscriptionGetPayload<typeof this.subscriptionDetailsArgs>[]
  > {
    this.logger.log(
      'List subscriptions',
      logMeta({
        userId,
      }),
    );

    return this.prisma.subscription.findMany({
      where: { userId },
      ...this.subscriptionDetailsArgs,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(
    id: string,
    userId: string,
  ): Promise<
    Prisma.SubscriptionGetPayload<typeof this.subscriptionDetailsArgs>
  > {
    this.logger.log(
      'Get subscription',
      logMeta({
        id,
        userId,
      }),
    );

    const subscription = await this.prisma.subscription.findFirst({
      where: { id, userId },
      ...this.subscriptionDetailsArgs,
    });

    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }
}
