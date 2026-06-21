-- CreateTable
CREATE TABLE "fixed_expenses" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "cardId" UUID,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "installmentAmount" DECIMAL(12,2) NOT NULL,
    "totalInstallments" INTEGER NOT NULL,
    "startMonth" DATE NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixed_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixed_expenses_userId_idx" ON "fixed_expenses"("userId");

-- CreateIndex
CREATE INDEX "fixed_expenses_categoryId_idx" ON "fixed_expenses"("categoryId");

-- CreateIndex
CREATE INDEX "fixed_expenses_cardId_idx" ON "fixed_expenses"("cardId");

-- CreateIndex
CREATE INDEX "fixed_expenses_deletedAt_idx" ON "fixed_expenses"("deletedAt");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fixedExpenseId_fkey" FOREIGN KEY ("fixedExpenseId") REFERENCES "fixed_expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
