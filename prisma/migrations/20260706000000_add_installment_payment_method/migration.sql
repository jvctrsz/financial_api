-- CreateEnum
CREATE TYPE "InstallmentPaymentMethod" AS ENUM ('CREDIT_CARD', 'BOLETO');

-- AlterTable
ALTER TABLE "installment_expenses" ADD COLUMN "paymentMethod" "InstallmentPaymentMethod" NOT NULL;
