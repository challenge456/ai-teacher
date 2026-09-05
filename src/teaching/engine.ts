import { ZodError } from "zod";
import type { TeachingModelProvider } from "./provider";
import {
  GenerateLessonRequestSchema,
  LessonPlanSchema,
  SubmitAnswerRequestSchema,
  AnswerResponseSchema,
  type GenerateLessonRequest,
  type LessonPlan,
  type SubmitAnswerRequest,
  type AnswerResponse,
} from "./schemas";

export class TeachingEngineError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "TeachingEngineError";
    this.status = status;
    this.details = details;
  }
}

const MAX_ATTEMPTS_PER_SECTION = 3;

/**
 * TeachingEngine
 *
 * Validates the inbound request, delegates to a TeachingModelProvider,
 * then validates the output before it leaves the engine. The rest of the app
 * never talks to a model SDK — only to this service.
 */
export class TeachingEngine {
  constructor(private readonly provider: TeachingModelProvider) {}

  async generateLesson(raw: unknown): Promise<LessonPlan> {
    let request: GenerateLessonRequest;
    try {
      request = GenerateLessonRequestSchema.parse(raw);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new TeachingEngineError("Invalid lesson request", 400, error.flatten());
      }
      throw error;
    }

    const untrusted = await this.provider.generateLesson(request);

    try {
      return LessonPlanSchema.parse(untrusted);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new TeachingEngineError(
          "Provider returned an invalid lesson plan",
          502,
          error.flatten(),
        );
      }
      throw error;
    }
  }

  async evaluateAnswerAndAdapt(raw: unknown, lesson: LessonPlan): Promise<AnswerResponse> {
    let request: SubmitAnswerRequest;
    try {
      request = SubmitAnswerRequestSchema.parse(raw);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new TeachingEngineError("Invalid answer submission", 400, error.flatten());
      }
      throw error;
    }

    const section = lesson.sections.find((s) => s.id === request.sectionId);
    if (!section) {
      throw new TeachingEngineError(
        `Section ${request.sectionId} not found in lesson`,
        404,
      );
    }

    if (request.attemptNumber > MAX_ATTEMPTS_PER_SECTION) {
      throw new TeachingEngineError(
        `Max attempts (${MAX_ATTEMPTS_PER_SECTION}) exceeded for this section`,
        400,
      );
    }

    const learner = lesson.learner;
    if (!learner) {
      throw new TeachingEngineError(
        "Learner profile not available in lesson",
        500,
      );
    }

    const evaluation = await this.provider.evaluateAnswer({
      section,
      learner,
      answer: request.answer,
      attemptNumber: request.attemptNumber,
    });

    let nextAction: "advance" | "retry" | "complete";
    let adaptation = undefined;
    let message = "";

    if (evaluation.verdict === "correct") {
      const isLastSection = section.order === lesson.sections.length - 1;
      nextAction = isLastSection ? "complete" : "advance";
      message = evaluation.feedback;
    } else if (request.attemptNumber >= MAX_ATTEMPTS_PER_SECTION) {
      nextAction = "advance";
      message = `${evaluation.feedback} Let us move forward to keep learning.`;
    } else {
      nextAction = "retry";
      adaptation = await this.provider.generateAdaptation({
        lesson,
        section,
        evaluation,
        learner,
        attemptNumber: request.attemptNumber,
      });
      message = adaptation.explanation;
    }

    const currentSectionIndex = section.order;
    const totalSections = lesson.sections.length;

    try {
      return AnswerResponseSchema.parse({
        evaluation,
        adaptation,
        progress: {
          currentSection: currentSectionIndex,
          totalSections,
          sectionsCompleted:
            nextAction === "advance" || nextAction === "complete"
              ? currentSectionIndex + 1
              : currentSectionIndex,
          currentAttempt: request.attemptNumber,
          maxAttempts: MAX_ATTEMPTS_PER_SECTION,
        },
        nextAction,
        message,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new TeachingEngineError(
          "Response validation failed",
          502,
          error.flatten(),
        );
      }
      throw error;
    }
  }
}
