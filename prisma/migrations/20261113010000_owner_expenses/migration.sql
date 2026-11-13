-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "businessDate" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_businessDate_voidedAt_idx" ON "expenses"("businessDate", "voidedAt");

-- CreateIndex
CREATE INDEX "expenses_createdAt_idx" ON "expenses"("createdAt");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
