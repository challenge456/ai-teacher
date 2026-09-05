export { TeachingEngine, TeachingEngineError } from "./engine";
export { createTeachingEngine, createTeachingProvider } from "./factory";
export type { TeachingProviderId } from "./factory";
export { MockTeachingProvider } from "./mock-provider";
export { ClaudeTeachingProvider } from "./claude-provider";
export type {
  TeachingModelProvider,
  GenerateSectionInput,
  EvaluateAnswerInput,
  GenerateAdaptationInput,
} from "./provider";
export {
  GenerateLessonRequestSchema,
  LearnerProfileSchema,
  LessonPlanSchema,
  LessonSectionSchema,
  LessonQuestionSchema,
  SourceCitationSchema,
  AnswerEvaluationSchema,
  AdaptationSchema,
  AnswerResponseSchema,
} from "./schemas";
export type {
  GenerateLessonRequest,
  AnswerVerdict,
  LearnerProfile,
  LessonPlan,
  LessonSection,
  LessonQuestion,
  SourceCitation,
  AnswerEvaluation,
  Adaptation,
  AnswerResponse,
} from "./schemas";
