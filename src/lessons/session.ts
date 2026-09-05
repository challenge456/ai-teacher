import type { Prisma } from "@prisma/client";
import {
  AnswerResponseSchema,
  LessonPlanSchema,
  type AnswerResponse,
  type LessonPlan,
} from "@/teaching";

export const lessonInclude = {
  sections: { orderBy: { order: "asc" } },
  session: { include: { answers: { orderBy: { createdAt: "desc" }, take: 1 } } },
} satisfies Prisma.LessonInclude;

type StoredLesson = Prisma.LessonGetPayload<{ include: typeof lessonInclude }>;

export type PersistedLesson = {
  lessonId: string;
  lesson: LessonPlan;
  session: {
    currentSection: number;
    currentAttempt: number;
    state: string;
    lastResponse?: AnswerResponse;
  };
};

export function lessonToCreateData(lesson: LessonPlan, sourceDocumentId?: string, studentId?: string): Prisma.LessonCreateInput {
  return {
    topic: lesson.topic,
    objective: lesson.objective,
    estimatedMinutes: lesson.estimatedMinutes,
    concepts: lesson.concepts,
    learner: lesson.learner,
    sourceDocument: sourceDocumentId ? { connect: { id: sourceDocumentId } } : undefined,
    student: studentId ? { connect: { id: studentId } } : undefined,
    sections: {
      create: lesson.sections.map((section) => ({
        sourceId: section.id,
        order: section.order,
        concept: section.concept,
        explanation: section.explanation,
        spokenScript: section.spokenScript,
        visualType: section.visualType,
        visualContent: section.visualContent,
        question: section.question ?? undefined,
        expectedConcept: section.expectedConcept,
        successCriteria: section.successCriteria,
        durationHintSec: section.durationHintSec,
        language: section.language,
        sourceCitations: section.sourceCitations,
      })),
    },
    session: { create: {} },
  };
}

export function toPersistedLesson(stored: StoredLesson): PersistedLesson {
  if (!stored.session) throw new Error("Lesson session is missing");

  const lesson = LessonPlanSchema.parse({
    topic: stored.topic,
    objective: stored.objective,
    estimatedMinutes: stored.estimatedMinutes,
    concepts: stored.concepts,
    learner: stored.learner,
    sections: stored.sections.map((section) => ({
      id: section.sourceId,
      order: section.order,
      concept: section.concept,
      explanation: section.explanation,
      spokenScript: section.spokenScript,
      visualType: section.visualType,
      visualContent: section.visualContent,
      question: section.question,
      expectedConcept: section.expectedConcept,
      successCriteria: section.successCriteria,
      durationHintSec: section.durationHintSec,
      language: section.language,
      sourceCitations: section.sourceCitations,
    })),
  });
  const lastAnswer = stored.session.answers[0];

  return {
    lessonId: stored.id,
    lesson,
    session: {
      currentSection: stored.session.currentSection,
      currentAttempt: stored.session.currentAttempt,
      state: stored.session.state,
      lastResponse: lastAnswer
        ? AnswerResponseSchema.parse({
            evaluation: lastAnswer.evaluation,
            adaptation: lastAnswer.adaptation ?? undefined,
            nextAction: lastAnswer.nextAction,
            message: lastAnswer.message,
            progress: {
              currentSection: stored.session.currentSection,
              totalSections: lesson.sections.length,
              sectionsCompleted:
                lastAnswer.nextAction === "complete" || lastAnswer.nextAction === "advance"
                  ? Math.min(stored.session.currentSection, lesson.sections.length)
                  : stored.session.currentSection,
              currentAttempt: lastAnswer.attemptNumber,
              maxAttempts: 3,
            },
          })
        : undefined,
    },
  };
}
