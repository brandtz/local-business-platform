-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'SQUARE');

-- CreateEnum
CREATE TYPE "PaymentConnectionStatus" AS ENUM ('INACTIVE', 'VERIFYING', 'ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "PaymentConnection" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "PaymentConnectionStatus" NOT NULL DEFAULT 'INACTIVE',
    "mode" TEXT NOT NULL DEFAULT 'sandbox',
    "encryptedCredentials" TEXT NOT NULL,
    "credentialsIv" TEXT NOT NULL,
    "credentialsTag" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),
    "verificationError" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,

    CONSTRAINT "PaymentConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentConnection_tenantId_provider_key" ON "PaymentConnection"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "PaymentConnection_tenantId_status_idx" ON "PaymentConnection"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PaymentConnection_tenantId_provider_status_idx" ON "PaymentConnection"("tenantId", "provider", "status");

-- AddForeignKey
ALTER TABLE "PaymentConnection" ADD CONSTRAINT "PaymentConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
