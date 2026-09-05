import { Anthropic } from "@anthropic-ai/sdk";
import type {
  GenerateSectionInput,
  GenerateAdaptationInput,
  EvaluateAnswerInput,
  TeachingModelProvider,
} from "./provider";
import {
  LessonPlanSchema,
  AnswerEvaluationSchema,
  AdaptationSchema,
  type Adaptation,
  type AnswerEvaluation,
  type GenerateLessonRequest,
  type LessonPlan,
  type LessonSection,
} from "./schemas";
import { MockTeachingProvider } from "./mock-provider";

/**
 * ClaudeTeachingProvider
 *
 * Uses Claude API to generate structured lessons, evaluate answers, and adapt teaching.
 * All responses are validated with Zod schemas. On error, falls back to MockTeachingProvider.
 * No RAG, pgvector, TTS, avatar, or video.
 */
export class ClaudeTeachingProvider implements TeachingModelProvider {
  readonly id = "claude";
  private client: Anthropic;
  private fallback: MockTeachingProvider;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is required for ClaudeTeachingProvider",
      );
    }
    this.client = new Anthropic({ apiKey });
    this.fallback = new MockTeachingProvider();
  }

  async generateLesson(input: GenerateLessonRequest): Promise<LessonPlan> {
    try {
      const prompt = this.buildGenerateLessonPrompt(input);
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Claude response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      // Include learner profile in the lesson plan
      parsed.learner = input.learner;
      return LessonPlanSchema.parse(parsed);
    } catch (error) {
      console.error("Claude generateLesson failed, falling back to mock:", error);
      return this.fallback.generateLesson(input);
    }
  }

  async generateSection(input: GenerateSectionInput): Promise<LessonSection> {
    try {
      const prompt = this.buildGenerateSectionPrompt(input);
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Claude response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed; // Caller will validate
    } catch (error) {
      console.error("Claude generateSection failed, falling back to mock:", error);
      return this.fallback.generateSection(input);
    }
  }

  async evaluateAnswer(input: EvaluateAnswerInput): Promise<AnswerEvaluation> {
    try {
      const prompt = this.buildEvaluateAnswerPrompt(input);
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Claude response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return AnswerEvaluationSchema.parse(parsed);
    } catch (error) {
      console.error("Claude evaluateAnswer failed, falling back to mock:", error);
      return this.fallback.evaluateAnswer(input);
    }
  }

  async generateAdaptation(input: GenerateAdaptationInput): Promise<Adaptation> {
    try {
      const prompt = this.buildGenerateAdaptationPrompt(input);
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Claude response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return AdaptationSchema.parse(parsed);
    } catch (error) {
      console.error(
        "Claude generateAdaptation failed, falling back to mock:",
        error,
      );
      return this.fallback.generateAdaptation(input);
    }
  }

  private buildGenerateLessonPrompt(input: GenerateLessonRequest): string {
    return `You are an expert teacher. Generate a structured lesson plan in JSON.

Topic: ${input.topic}
Learner Level: ${input.learner.level}
Known Topics: ${input.learner.knownTopics.join(", ") || "None"}
Objective: ${input.learner.objective}
Teaching Style: ${input.learner.teachingStyle}
Available Time: ${input.learner.availableMinutes} minutes
Preferred Depth: ${input.learner.preferredDepth}
Language: ${input.learner.language}
${input.context ? `\nGrounding rule: use the uploaded source below for factual claims. Do not invent facts not supported by it.\n${input.context}` : ""}

Return a JSON object matching this structure:
{
  "topic": "string",
  "objective": "string",
  "estimatedMinutes": number,
  "concepts": ["string"],
  "sections": [
    {
      "id": "string",
      "order": number,
      "concept": "string",
      "explanation": "string",
      "spokenScript": "string",
      "visualType": "none|diagram|equation|table|steps|example|blackboard",
      "visualContent": "string",
      "question": {
        "prompt": "string",
        "kind": "open|short-answer|multiple-choice",
        "choices": ["string"] // optional
      } or null,
      "expectedConcept": "string",
      "successCriteria": ["string"],
      "durationHintSec": number,
      "language": "string"
    }
  ]
}

Generate exactly 5 progressive sections. Adapt depth, duration, and examples to the learner profile.`;
  }

  private buildGenerateSectionPrompt(input: GenerateSectionInput): string {
    const previousSummary =
      input.previousSections?.map((s) => `- ${s.concept}`).join("\n") || "None";
    return `Generate a single teaching section in JSON for order ${input.order}.

Topic: ${input.topic}
Concept Focus: ${input.concept}
Learner Level: ${input.learner.level}
Teaching Style: ${input.learner.teachingStyle}
Previous Sections: ${previousSummary}

Return a JSON section object with: id, order, concept, explanation, spokenScript, visualType, visualContent, question (or null), expectedConcept, successCriteria, durationHintSec, language.`;
  }

  private buildEvaluateAnswerPrompt(input: EvaluateAnswerInput): string {
    return `You are an expert teacher evaluating a student's answer.

Concept: ${input.section.concept}
Expected Concept: ${input.section.expectedConcept}
Learner Level: ${input.learner.level}
Student's Answer: "${input.answer}"
Attempt Number: ${input.attemptNumber}

Evaluate the answer and return JSON:
{
  "verdict": "correct|partial|incorrect",
  "score": number (0-1),
  "feedback": "string",
  "misconception": "string or null",
  "weakConcept": "string or null",
  "reasoning": "string"
}

Be fair but accurate. Score 0.6+ for correct, 0.3-0.6 for partial, <0.3 for incorrect.`;
  }

  private buildGenerateAdaptationPrompt(input: GenerateAdaptationInput): string {
    return `You are an expert teacher adapting your teaching based on student feedback.

Section: ${input.section.concept}
Expected Concept: ${input.section.expectedConcept}
Student Verdict: ${input.evaluation.verdict}
Student Feedback: ${input.evaluation.feedback}
Misconception Detected: ${input.evaluation.misconception || "None"}
Attempt Number: ${input.attemptNumber}

Generate an adaptation JSON:
{
  "strategy": "advance|reteach-simple|alternative-explanation|visual-aid|follow-up-question|hint|worked-example",
  "explanation": "string",
  "spokenScript": "string",
  "visualType": "none|diagram|equation|table|steps|example|blackboard",
  "visualContent": "string",
  "followUpQuestion": {"prompt": "string", "kind": "open|short-answer|multiple-choice"} or null,
  "expectedConcept": "string",
  "successCriteria": ["string"],
  "reasoning": "string"
}

If verdict=correct, use "advance" strategy.
If verdict=partial, use "alternative-explanation" or "visual-aid".
If verdict=incorrect, use "reteach-simple" or "worked-example".`;
  }
}
