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
import { isUniqueViolationOnField } from '../../common/utils/prisma-errors.util';

import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { toSubscriptionResponse } from './subscriptions.mapper';
import { CreateSubscriptionResponseDto } from './dto/create-subscription-response.dto';

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
  providerRef: string | null;
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
      provider: ProviderEnum;
      providerRef: string;
      checkoutUrl: string;
      idempotencyKey: string;
    };
    idempotentReplay: boolean;
  }): CreateSubscriptionResponseDto {
    return {
      subscriptionId: params.subscriptionId,
      status: params.status,
      provider: params.provider,
      pricing: {
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

  /**
   * Ensures providerRef exists for an existing Payment row.
   * This covers the edge case where the DB transaction succeeded but the process crashed
   * before we persisted providerRef (because provider init is done outside the transaction).
   *
   * We intentionally keep this minimal: initialize provider again (mock provider should be
   * idempotent on its own), update providerRef in DB, then re-fetch.
   */
  private async ensureProviderRefOrRecover(params: {
    existing: ReplayPayment;
    pricingTotal: string;
    region: string;
  }): Promise<ReplayPayment> {
    if (params.existing.providerRef) return params.existing;

    const providerClient = createPaymentProvider(params.region);

    const paymentInit = await providerClient.initPayment({
      amount: params.pricingTotal,
      currency: 'USD',
    });

    await this.prisma.payment.update({
      where: { id: params.existing.id },
      data: { providerRef: paymentInit.providerRef },
    });

    const refreshed = await this.findPaymentByIdempotencyKey(
      params.existing.idempotencyKey,
    );

    if (!refreshed || !refreshed.providerRef) {
      // In a real system we'd have a stronger recovery strategy (retries, reconciliation).
      // For this assignment, this indicates an unexpected inconsistency.
      throw new Error('Failed to recover providerRef for idempotent replay');
    }

    return refreshed;
  }

  private async buildReplayResponse(
    existingPayment: ReplayPayment,
  ): Promise<CreateSubscriptionResponseDto> {
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

    // providerRef is required by response contract; recover if needed.
    const ensured = await this.ensureProviderRefOrRecover({
      existing: existingPayment,
      pricingTotal: pricing.total,
      region:
        s.provider === ProviderEnum.MONOBANK
          ? 'UA'
          : s.provider === ProviderEnum.PIX
            ? 'BR'
            : 'US',
    });

    const providerRef = ensured.providerRef;
    if (!providerRef) {
      throw new Error('providerRef is missing after recovery');
    }

    return this.buildResponse({
      subscriptionId: s.id,
      status: s.status,
      provider: s.provider,
      pricing,
      payment: {
        id: ensured.id,
        status: ensured.status,
        providerRef,
        provider: ensured.provider,
        idempotencyKey: ensured.idempotencyKey,
        checkoutUrl: checkoutUrlFromProviderRef(ensured.provider, providerRef),
      },
      idempotentReplay: true,
    });
  }

  /**
   * Idempotency-Key required
   * subscription(PENDING) + payment(CREATED) are created in a DB transaction
   * provider init is executed outside the DB transaction
   */
  async create(
    dto: CreateSubscriptionDto,
    idempotencyKey: string,
    userId: string,
  ): Promise<CreateSubscriptionResponseDto> {
    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    this.logger.log(
      'Create subscription request',
      logMeta({
        userId,
        planCode: dto.planCode,
        billingPeriod: dto.billingPeriod,
        seats: dto.seats ?? 0,
        promoCode: dto.promoCode ?? null,
        idempotencyKey,
      }),
    );

    const user = await this.usersService.findById(userId);
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
        userId,
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

    // Idempotency early-return:
    // If we already have a completed providerRef, replay immediately.
    // If providerRef is missing (crash between DB commit and providerRef update),
    // we will recover it and then replay.
    const existing = await this.findPaymentByIdempotencyKey(idempotencyKey);
    if (existing) {
      const ensured = await this.ensureProviderRefOrRecover({
        existing,
        pricingTotal: pricing.total,
        region: user.region,
      });
      if (ensured.providerRef) return this.buildReplayResponse(ensured);
      // If still missing, continue into normal flow; DB unique constraint will handle.
    }

    try {
      // DB transaction contains only DB operations (no external network calls).
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

        const payment = await tx.payment.create({
          data: {
            subscriptionId: subscription.id,
            provider: providerEnum,
            status: PaymentStatus.CREATED,
            amount: new Prisma.Decimal(pricing.total),
            currency: 'USD',
            providerRef: null,
            idempotencyKey,
          },
        });

        return { subscription, payment };
      });

      // External call is outside the transaction to avoid holding DB locks during network I/O.
      const paymentInit = await providerClient.initPayment({
        amount: pricing.total,
        currency: 'USD',
      });

      // Persist providerRef after provider init.
      const payment = await this.prisma.payment.update({
        where: { id: result.payment.id },
        data: { providerRef: paymentInit.providerRef },
      });

      this.logger.log(
        'Subscription and payment created',
        logMeta({
          subscriptionId: result.subscription.id,
          paymentId: payment.id,
          provider: payment.provider,
          amount: pricing.total,
          idempotencyKey,
        }),
      );

      const providerRef = payment.providerRef;
      if (!providerRef) {
        throw new Error('providerRef is missing after provider init update');
      }

      return this.buildResponse({
        subscriptionId: result.subscription.id,
        status: result.subscription.status,
        provider: result.subscription.provider,
        pricing,
        payment: {
          id: payment.id,
          status: payment.status,
          providerRef,
          provider: payment.provider,
          idempotencyKey: payment.idempotencyKey,
          checkoutUrl:
            paymentInit.checkoutUrl ??
            checkoutUrlFromProviderRef(payment.provider, providerRef),
        },
        idempotentReplay: false,
      });
    } catch (e) {
      // Race-safe idempotency:
      // If another concurrent request won the unique constraint on idempotency_key,
      // fetch the existing payment and replay (recover providerRef if needed).
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002' &&
        isUniqueViolationOnField(e, 'idempotency_key')
      ) {
        this.logger.warn(
          'Idempotency unique constraint hit (race-safe replay)',
          logMeta({
            idempotencyKey,
          }),
        );

        const existing2 =
          await this.findPaymentByIdempotencyKey(idempotencyKey);
        if (existing2) {
          const ensured = await this.ensureProviderRefOrRecover({
            existing: existing2,
            pricingTotal: pricing.total,
            region: user.region,
          });
          return this.buildReplayResponse(ensured);
        }
      }

      this.logger.error(
        'Failed to create subscription',
        logMeta({
          idempotencyKey,
          userId,
          error: e instanceof Error ? e.message : String(e),
        }),
      );

      throw e;
    }
  }

  // Access control: userId is taken from JWT (req.user.id) and used in queries
  private readonly subscriptionPublicArgs =
    Prisma.validator<Prisma.SubscriptionDefaultArgs>()({
      include: {
        plan: {
          select: {
            code: true,
            basePriceMonthly: true,
            pricePerSeatMonthly: true,
            includedApiCalls: true,
          },
        },
        promoCode: {
          select: {
            code: true,
            type: true,
            value: true,
          },
        },
        payments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            provider: true,
            amount: true,
            currency: true,
            providerRef: true,
            createdAt: true,
          },
        },
      },
    });

  async findAll(userId: string): Promise<SubscriptionResponseDto[]> {
    this.logger.log(
      'List subscriptions',
      logMeta({
        userId,
      }),
    );

    const items = await this.prisma.subscription.findMany({
      where: { userId },
      ...this.subscriptionPublicArgs,
      orderBy: { createdAt: 'desc' },
    });

    return items.map(toSubscriptionResponse);
  }

  async findById(id: string, userId: string): Promise<SubscriptionResponseDto> {
    this.logger.log(
      'Get subscription',
      logMeta({
        id,
        userId,
      }),
    );

    const subscription = await this.prisma.subscription.findFirst({
      where: { id, userId },
      ...this.subscriptionPublicArgs,
    });

    if (!subscription) throw new NotFoundException('Subscription not found');

    return toSubscriptionResponse(subscription);
  }
}
