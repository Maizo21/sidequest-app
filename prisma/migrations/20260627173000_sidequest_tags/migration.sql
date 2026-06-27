ALTER TABLE "Sidequest" ADD COLUMN "tag" TEXT;
ALTER TABLE "SidequestSuggestion" ADD COLUMN "tag" TEXT;

CREATE INDEX "Sidequest_tag_idx" ON "Sidequest"("tag");
CREATE INDEX "SidequestSuggestion_tag_idx" ON "SidequestSuggestion"("tag");
