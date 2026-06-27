CREATE TYPE "SidequestSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE SEQUENCE "Sidequest_id_seq" START WITH 1000 INCREMENT BY 1;

CREATE TABLE "Sidequest" (
    "id" INTEGER NOT NULL DEFAULT nextval('"Sidequest_id_seq"'),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "createdByUserId" TEXT,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sidequest_pkey" PRIMARY KEY ("id")
);

ALTER SEQUENCE "Sidequest_id_seq" OWNED BY "Sidequest"."id";

CREATE TABLE "SidequestSuggestion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "status" "SidequestSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "prompt" TEXT,
    "model" TEXT,
    "generatedByUserId" TEXT,
    "generatedByEmail" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SidequestSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Sidequest_active_idx" ON "Sidequest"("active");
CREATE INDEX "Sidequest_category_idx" ON "Sidequest"("category");
CREATE INDEX "SidequestSuggestion_status_idx" ON "SidequestSuggestion"("status");
CREATE INDEX "SidequestSuggestion_createdAt_idx" ON "SidequestSuggestion"("createdAt");
