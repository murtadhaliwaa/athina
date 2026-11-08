import type { Prisma } from "@prisma/client";

export async function nextDailyNumber(
  tx: Prisma.TransactionClient,
  businessDate: string
) {
  const rows = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO daily_counters ("businessDate", "lastNumber")
    VALUES (${businessDate}::date, 1)
    ON CONFLICT ("businessDate")
    DO UPDATE SET "lastNumber" = daily_counters."lastNumber" + 1
    RETURNING "lastNumber"`;
  return rows[0].lastNumber;
}
