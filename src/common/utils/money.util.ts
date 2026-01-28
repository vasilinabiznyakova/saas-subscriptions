// src/common/utils/money.util.ts
import { Prisma } from '@prisma/client';

const D = Prisma.Decimal;

export const roundMoney = (value: Prisma.Decimal): Prisma.Decimal =>
  value.toDecimalPlaces(2, D.ROUND_HALF_UP);

export const toMoneyString = (value: Prisma.Decimal): string =>
  roundMoney(value).toFixed(2);
