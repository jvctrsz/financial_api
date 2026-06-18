-- CreateTable
CREATE TABLE "aside_expenses" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "recurrent" BOOLEAN NOT NULL DEFAULT false,
    "startMonth" DATE NOT NULL,
    "endMonth" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "aside_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aside_expenses_userId_idx" ON "aside_expenses"("userId");

-- CreateIndex
CREATE INDEX "aside_expenses_userId_startMonth_idx" ON "aside_expenses"("userId", "startMonth");

-- AddForeignKey
ALTER TABLE "aside_expenses" ADD CONSTRAINT "aside_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
