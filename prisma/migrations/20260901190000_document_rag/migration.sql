-- Document-grounded learning. Original binaries are not stored here; only extracted text and chunks.
CREATE TABLE "LearningDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "characterStart" INTEGER NOT NULL,
    "characterEnd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Lesson" ADD COLUMN "sourceDocumentId" TEXT;
ALTER TABLE "LessonSection" ADD COLUMN "sourceCitations" JSONB NOT NULL DEFAULT '[]';

CREATE UNIQUE INDEX "DocumentChunk_documentId_order_key" ON "DocumentChunk"("documentId", "order");
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LearningDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "LearningDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
