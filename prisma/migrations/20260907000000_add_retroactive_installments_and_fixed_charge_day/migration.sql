-- AlterTable
ALTER TABLE "installment_expenses"
ADD COLUMN "purchaseDate" DATE NOT NULL;

-- AlterTable
ALTER TABLE "transactions"
ADD COLUMN "installmentNumber" INTEGER;

-- AlterTable
ALTER TABLE "fixed_expenses"
ADD COLUMN "chargeDay" INTEGER NOT NULL;

-- AddConstraint
ALTER TABLE "fixed_expenses"
ADD CONSTRAINT "fixed_expenses_chargeDay_check"
CHECK ("chargeDay" BETWEEN 1 AND 31);
