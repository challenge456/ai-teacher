import { z } from "zod";

/**
 * Teaching-domain schemas.
 *
 * These are the contract between the Teaching Engine, providers (mock today,
 * Claude/Gemini later), the API, and the classroom UI. Keep them structured —
 * not free-form chatbot text — so later phases can plug in TTS (spokenScript),
 * a blackboard renderer (visualType + visualContent), and adaptive teaching
 * (question / expectedConcept / successCriteria) without rewriting the app.
 */

export const LearnerLevelSchema = z.enum([
  "beginner",
  "elementary",
  "intermediate",
  "advanced",
]);

export const TeachingStyleSchema = z.enum([
  "socratic",
  "direct",
  "storytelling",
  "worked-example",
  "inquiry",
]);

export const PreferredDepthSchema = z.enum(["overview", "standard", "deep"]);

export const VisualTypeSchema = z.enum([
  "none",
  "diagram",
  "equation",
  "table",
  "steps",
  "example",
  "blackboard",
]);

export const QuestionKindSchema = z.enum([
  "open",
  "short-answer",
  "multiple-choice",
]);

export const LessonQuestionSchema = z.object({
  prompt: z.string().min(1),
  kind: QuestionKindSchema,
  choices: z.array(z.string().min(1)).min(2).optional(),
});

/** A compact, display-safe pointer to uploaded learning material. */
export const SourceCitationSchema = z.object({
  documentId: z.string().min(1),
  documentName: z.string().min(1),
  chunkId: z.string().min(1),
  chunkOrder: z.number().int().nonnegative(),
  excerpt: z.string().min(1).max(500),
});

export const LearnerProfileSchema = z.object({
  level: LearnerLevelSchema,
  knownTopics: z.array(z.string().trim().min(1)).default([]),
  objective: z.string().trim().min(1).max(500),
  teachingStyle: TeachingStyleSchema,
  language: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Use a BCP-47 language tag such as en or es-ES"),
  availableMinutes: z.number().int().min(5).max(180),
  preferredDepth: PreferredDepthSchema,
});

export const LessonSectionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  concept: z.string().min(1),
  explanation: z.string().min(1),
  /** Future TTS / avatar input. Not spoken in Phase 2A. */
  spokenScript: z.string().min(1),
  visualType: VisualTypeSchema,
  /** Description a future blackboard renderer can interpret. */
  visualContent: z.string(),
  question: LessonQuestionSchema.nullable(),
  expectedConcept: z.string().min(1),
  successCriteria: z.array(z.string().min(1)).min(1),
  durationHintSec: z.number().int().positive(),
  language: z.string().min(2),
  sourceCitations: z.array(SourceCitationSchema).default([]),
});

export const LessonPlanSchema = z.object({
  topic: z.string().min(1),
  objective: z.string().min(1),
  estimatedMinutes: z.number().positive(),
  concepts: z.array(z.string().min(1)).min(1),
  sections: z.array(LessonSectionSchema).min(1),
  learner: LearnerProfileSchema,
});

export const GenerateLessonRequestSchema = z.object({
  topic: z.string().trim().min(1).max(200),
  learner: LearnerProfileSchema,
  context: z.string().trim().max(2000).optional(),
  documentId: z.string().min(1).optional(),
  studentId: z.string().uuid().optional(),
});

export const AnswerVerdictSchema = z.enum(["correct", "partial", "incorrect"]);

export const AnswerEvaluationSchema = z.object({
  verdict: AnswerVerdictSchema,
  score: z.number().min(0).max(1),
  feedback: z.string().min(1),
  misconception: z.string().optional(),
  weakConcept: z.string().optional(),
  reasoning: z.string().optional(),
});

export const AdaptationStrategySchema = z.enum([
  "advance",
  "reteach-simple",
  "alternative-explanation",
  "visual-aid",
  "follow-up-question",
  "hint",
  "worked-example",
]);

export const AdaptationSchema = z.object({
  strategy: AdaptationStrategySchema,
  explanation: z.string().min(1),
  spokenScript: z.string().min(1),
  visualType: VisualTypeSchema,
  visualContent: z.string(),
  followUpQuestion: LessonQuestionSchema.optional(),
  expectedConcept: z.string().min(1),
  successCriteria: z.array(z.string().min(1)).min(1),
  reasoning: z.string().optional(),
});

export const SubmitAnswerRequestSchema = z.object({
  lessonId: z.string().min(1),
  sectionId: z.string().min(1),
  answer: z.string().trim().min(1).max(5000),
  attemptNumber: z.number().int().min(1).default(1),
});

export const TeachingProgressSchema = z.object({
  currentSection: z.number().int().nonnegative(),
  totalSections: z.number().int().positive(),
  sectionsCompleted: z.number().int().nonnegative(),
  currentAttempt: z.number().int().min(1),
  maxAttempts: z.number().int().min(1),
});

export const AnswerResponseSchema = z.object({
  evaluation: AnswerEvaluationSchema,
  adaptation: AdaptationSchema.optional(),
  progress: TeachingProgressSchema,
  nextAction: z.enum(["advance", "retry", "complete"]),
  message: z.string().min(1),
});

export type AnswerVerdict = z.infer<typeof AnswerVerdictSchema>;
export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;
export type AdaptationStrategy = z.infer<typeof AdaptationStrategySchema>;
export type Adaptation = z.infer<typeof AdaptationSchema>;
export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequestSchema>;
export type TeachingProgress = z.infer<typeof TeachingProgressSchema>;
export type AnswerResponse = z.infer<typeof AnswerResponseSchema>;
export type LearnerLevel = z.infer<typeof LearnerLevelSchema>;
export type TeachingStyle = z.infer<typeof TeachingStyleSchema>;
export type PreferredDepth = z.infer<typeof PreferredDepthSchema>;
export type VisualType = z.infer<typeof VisualTypeSchema>;
export type QuestionKind = z.infer<typeof QuestionKindSchema>;
export type LessonQuestion = z.infer<typeof LessonQuestionSchema>;
export type SourceCitation = z.infer<typeof SourceCitationSchema>;
export type LearnerProfile = z.infer<typeof LearnerProfileSchema>;
export type LessonSection = z.infer<typeof LessonSectionSchema>;
export type LessonPlan = z.infer<typeof LessonPlanSchema>;
export type GenerateLessonRequest = z.infer<typeof GenerateLessonRequestSchema>;
