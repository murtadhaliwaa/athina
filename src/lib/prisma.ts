import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrlKey: string | undefined;
};

/**
 * التشغيل: DATABASE_URL (Transaction pooler :6543) — يشارك الاتصالات ولا ينفد بحد 15.
 * DIRECT_URL للـ migrations فقط (schema.prisma directUrl)، لا للـ runtime.
 * لا نُعيد إنشاء العميل في كل HMR.
 */
function resolveRuntimeDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
}

function hardenDatabaseUrl(url: string | undefined) {
  if (!url) return url;
  try {
    const u = new URL(url);
    const isTransactionPooler =
      u.port === "6543" || u.searchParams.get("pgbouncer") === "true";

    if (!u.searchParams.has("connect_timeout")) {
      u.searchParams.set("connect_timeout", "15");
    }
    u.searchParams.set("pool_timeout", "30");

    if (isTransactionPooler) {
      // Next يشغّل استعلامات متوازية (Promise.all) — حد 1 يصفّ كل الشاشات ويسبب تأخيراً ثقيلاً
      u.searchParams.set("connection_limit", "5");
      u.searchParams.set("pgbouncer", "true");
    } else {
      // Session/direct: أقل من pool_size (15) حتى لا يظهر EMAXCONNSESSION
      u.searchParams.set("connection_limit", "5");
    }

    return u.toString();
  } catch {
    return url;
  }
}

function createPrisma(url: string | undefined) {
  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    errorFormat: "minimal",
  });
}

function getPrisma() {
  const url = hardenDatabaseUrl(resolveRuntimeDatabaseUrl());
  const urlKey = url ?? "";

  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaUrlKey === urlKey
  ) {
    return globalForPrisma.prisma;
  }

  const prev = globalForPrisma.prisma;
  globalForPrisma.prisma = createPrisma(url);
  globalForPrisma.prismaUrlKey = urlKey;
  void prev?.$disconnect().catch(() => undefined);
  return globalForPrisma.prisma;
}

export const prisma = getPrisma();
