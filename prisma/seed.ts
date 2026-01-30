import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Check your .env in the project root.',
  );
}

import { PrismaClient, PromoType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

// Create a PG pool and Prisma adapter (Prisma 7 config-first requirement)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const plans = [
    {
      code: 'STARTER',
      basePriceMonthly: '29.99',
      pricePerSeatMonthly: null,
      includedApiCalls: 1000,
    },
    {
      code: 'PROFESSIONAL',
      basePriceMonthly: '99.49',
      pricePerSeatMonthly: '15.75',
      includedApiCalls: 10_000,
    },
    {
      code: 'ENTERPRISE',
      basePriceMonthly: '299.90',
      pricePerSeatMonthly: '12.30',
      includedApiCalls: 100_000,
    },
  ] as const;

  const promoCodes = [
    {
      code: 'WELCOME10',
      type: PromoType.PERCENT,
      value: '10',
      isActive: true,
      expiresAt: null,
    },
    {
      code: 'SAVE20',
      type: PromoType.FIXED,
      value: '20',
      isActive: true,
      expiresAt: null,
    },
  ] as const;

  const testUsers = [
    {
      email: 'dev.ua@example.com',
      region: 'UA',
      password: 'DevPassword123!',
    },
    {
      email: 'dev.br@example.com',
      region: 'BR',
      password: 'DevPassword123!',
    },
    {
      email: 'dev.other@example.com',
      region: 'US',
      password: 'DevPassword123!',
    },
  ] as const;

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      plans.map((p) =>
        tx.plan.upsert({
          where: { code: p.code },
          update: {
            basePriceMonthly: p.basePriceMonthly,
            pricePerSeatMonthly: p.pricePerSeatMonthly,
            includedApiCalls: p.includedApiCalls,
          },
          create: {
            code: p.code,
            basePriceMonthly: p.basePriceMonthly,
            pricePerSeatMonthly: p.pricePerSeatMonthly,
            includedApiCalls: p.includedApiCalls,
          },
        }),
      ),
    );

    await Promise.all(
      promoCodes.map((pc) =>
        tx.promoCode.upsert({
          where: { code: pc.code },
          update: {
            type: pc.type,
            value: pc.value,
            isActive: pc.isActive,
            expiresAt: pc.expiresAt,
          },
          create: {
            code: pc.code,
            type: pc.type,
            value: pc.value,
            isActive: pc.isActive,
            expiresAt: pc.expiresAt,
          },
        }),
      ),
    );

    // Dev users
    await Promise.all(
      testUsers.map(async (u) => {
        const passwordHash = await bcrypt.hash(u.password, 10);

        return tx.user.upsert({
          where: { email: u.email },
          update: {
            region: u.region,
            passwordHash,
            isActive: true,
          },
          create: {
            email: u.email,
            region: u.region,
            passwordHash,
            isActive: true,
          },
        });
      }),
    );
  });

  const [plansCount, promoCount, usersCount] = await Promise.all([
    prisma.plan.count(),
    prisma.promoCode.count(),
    prisma.user.count(),
  ]);

  console.log('✅ Seed completed successfully');
  console.log(`Plans in DB: ${plansCount}`);
  console.log(`Promo codes in DB: ${promoCount}`);
  console.log(`Users in DB: ${usersCount}`);
  console.log(
    'Test users: dev.ua@example.com, dev.br@example.com, dev.other@example.com',
  );
  console.log('Password for all: DevPassword123!');
}

main()
  .catch((e: unknown) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
