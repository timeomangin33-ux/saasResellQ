-- Subscription tier and monthly AI credit ledger.
ALTER TABLE "users" ADD COLUMN "subscriptionPlan" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "users" ADD COLUMN "aiCreditsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "aiCreditsResetAt" DATETIME;

CREATE TABLE "ai_usage_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ai_usage_events_userId_createdAt_idx" ON "ai_usage_events"("userId", "createdAt");

CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
