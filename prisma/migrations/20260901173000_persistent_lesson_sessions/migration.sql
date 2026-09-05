-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "estimatedMinutes" DOUBLE PRECISION NOT NULL,
    "concepts" JSONB NOT NULL,
    "learner" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonSection" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "concept" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "spokenScript" TEXT NOT NULL,
    "visualType" TEXT NOT NULL,
    "visualContent" TEXT NOT NULL,
    "question" JSONB,
    "expectedConcept" TEXT NOT NULL,
    "successCriteria" JSONB NOT NULL,
    "durationHintSec" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    CONSTRAINT "LessonSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonSession" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "currentSection" INTEGER NOT NULL DEFAULT 0,
    "currentAttempt" INTEGER NOT NULL DEFAULT 1,
    "state" TEXT NOT NULL DEFAULT 'lesson-overview',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LessonSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "evaluation" JSONB NOT NULL,
    "adaptation" JSONB,
    "nextAction" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonSection_lessonId_sourceId_key" ON "LessonSection"("lessonId", "sourceId");
CREATE UNIQUE INDEX "LessonSection_lessonId_order_key" ON "LessonSection"("lessonId", "order");
CREATE UNIQUE INDEX "LessonSession_lessonId_key" ON "LessonSession"("lessonId");

-- AddForeignKey
ALTER TABLE "LessonSection" ADD CONSTRAINT "LessonSection_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonSession" ADD CONSTRAINT "LessonSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LessonSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "LessonSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
