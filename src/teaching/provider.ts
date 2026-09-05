import type {
  Adaptation,
  AnswerEvaluation,
  GenerateLessonRequest,
  LessonPlan,
  LessonSection,
} from "./schemas";

/**
 * TeachingModelProvider
 *
 * The rest of the app talks to this interface, never to a specific LLM.
 * Phase 2A ships a mock implementation. Later phases can add Claude / Gemini /
 * OpenAI providers that return the same validated shapes.
 */
export interface GenerateSectionInput {
  topic: string;
  learner: GenerateLessonRequest["learner"];
  concept: string;
  order: number;
  previousSections?: LessonSection[];
  context?: string;
}

export interface EvaluateAnswerInput {
  section: LessonSection;
  learner: GenerateLessonRequest["learner"];
  answer: string;
  attemptNumber: number;
}

export interface GenerateAdaptationInput {
  lesson: LessonPlan;
  section: LessonSection;
  evaluation: AnswerEvaluation;
  learner: GenerateLessonRequest["learner"];
  attemptNumber: number;
}

export interface TeachingModelProvider {
  readonly id: string;
  generateLesson(input: GenerateLessonRequest): Promise<LessonPlan>;
  generateSection(input: GenerateSectionInput): Promise<LessonSection>;
  evaluateAnswer(input: EvaluateAnswerInput): Promise<AnswerEvaluation>;
  generateAdaptation(input: GenerateAdaptationInput): Promise<Adaptation>;
}
