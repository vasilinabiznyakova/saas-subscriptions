import { Prisma } from '@prisma/client';

export function hasUniqueTarget(
  target: unknown,
  field: string,
): target is string[] {
  return (
    Array.isArray(target) &&
    target.every((v) => typeof v === 'string') &&
    target.includes(field)
  );
}

export function isUniqueViolationOnField(
  e: Prisma.PrismaClientKnownRequestError,
  field: string,
): boolean {
  const meta = e.meta as
    | {
        target?: unknown;
        driverAdapterError?: {
          cause?: { constraint?: { fields?: unknown } };
        };
      }
    | undefined;

  // Prisma classic meta.target
  if (hasUniqueTarget(meta?.target, field)) return true;

  // adapter-pg: meta.driverAdapterError.cause.constraint.fields
  const fields = meta?.driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(fields) && fields.includes(field)) return true;

  // fallback (last resort)
  return typeof e.message === 'string' && e.message.includes(`(\`${field}\`)`);
}
