-- Rename fixed expense installment domain to installment expenses.
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_fixedExpenseId_fkey";

DROP INDEX "transactions_fixedExpenseId_idx";

ALTER TABLE "fixed_expenses" RENAME TO "installment_expenses";
ALTER TABLE "installment_expenses" RENAME CONSTRAINT "fixed_expenses_pkey" TO "installment_expenses_pkey";
ALTER TABLE "installment_expenses" RENAME CONSTRAINT "fixed_expenses_userId_fkey" TO "installment_expenses_userId_fkey";
ALTER TABLE "installment_expenses" RENAME CONSTRAINT "fixed_expenses_categoryId_fkey" TO "installment_expenses_categoryId_fkey";
ALTER TABLE "installment_expenses" RENAME CONSTRAINT "fixed_expenses_cardId_fkey" TO "installment_expenses_cardId_fkey";

ALTER INDEX "fixed_expenses_userId_idx" RENAME TO "installment_expenses_userId_idx";
ALTER INDEX "fixed_expenses_categoryId_idx" RENAME TO "installment_expenses_categoryId_idx";
ALTER INDEX "fixed_expenses_cardId_idx" RENAME TO "installment_expenses_cardId_idx";
ALTER INDEX "fixed_expenses_deletedAt_idx" RENAME TO "installment_expenses_deletedAt_idx";

ALTER TABLE "transactions" RENAME COLUMN "fixedExpenseId" TO "installmentExpenseId";

CREATE INDEX "transactions_installmentExpenseId_idx" ON "transactions"("installmentExpenseId");

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_installmentExpenseId_fkey"
  FOREIGN KEY ("installmentExpenseId") REFERENCES "installment_expenses"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
