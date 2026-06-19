-- Move income balance inclusion from a global user preference to each income.
ALTER TABLE "incomes" ADD COLUMN "includeInBalance" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users" DROP COLUMN "includeIncomesInBalance";
