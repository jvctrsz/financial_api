-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT', 'PIX');

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "cardId" UUID,
    "periodId" UUID NOT NULL,
    "fixedExpenseId" UUID,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "transactionDate" DATE NOT NULL,
    "billingDate" DATE NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_userId_periodId_deletedAt_idx" ON "transactions"("userId", "periodId", "deletedAt");

-- CreateIndex
CREATE INDEX "transactions_userId_billingDate_deletedAt_idx" ON "transactions"("userId", "billingDate", "deletedAt");

-- CreateIndex
CREATE INDEX "transactions_categoryId_idx" ON "transactions"("categoryId");

-- CreateIndex
CREATE INDEX "transactions_cardId_idx" ON "transactions"("cardId");

-- CreateIndex
CREATE INDEX "transactions_fixedExpenseId_idx" ON "transactions"("fixedExpenseId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "salary_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
