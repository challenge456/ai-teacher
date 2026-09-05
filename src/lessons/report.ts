import type { AnswerVerdict } from "@/teaching";

export type ReportAnswer = {
  section: { concept: string; expectedConcept: string };
  evaluation: { verdict: AnswerVerdict; score: number; misconception?: string | null; weakConcept?: string | null };
};

export type LearningReport = {
  topic: string;
  scorePercent: number;
  answeredQuestions: number;
  strongConcepts: string[];
  needsRevision: Array<{ concept: string; reason: string }>;
  recommendation: string;
  suggestedNextTopic: string;
};

/** Summarises only saved evaluations, so completion feedback stays evidence-based. */
export function createLearningReport(topic: string, answers: ReportAnswer[]): LearningReport {
  const latestByConcept = new Map<string, ReportAnswer>();
  for (const answer of answers) latestByConcept.set(answer.section.concept, answer);
  const latest = [...latestByConcept.values()];
  const scorePercent = latest.length === 0 ? 0 : Math.round((latest.reduce((sum, answer) => sum + answer.evaluation.score, 0) / latest.length) * 100);
  const strongConcepts = latest.filter((answer) => answer.evaluation.verdict === "correct" || answer.evaluation.score >= 0.7).map((answer) => answer.section.concept);
  const needsRevision = latest
    .filter((answer) => answer.evaluation.verdict !== "correct" && answer.evaluation.score < 0.7)
    .map((answer) => ({
      concept: answer.section.concept,
      reason: answer.evaluation.misconception || answer.evaluation.weakConcept || `Review: ${answer.section.expectedConcept}`,
    }));
  const suggestedNextTopic = needsRevision.length > 0 ? `Revision: ${needsRevision[0].concept}` : `Apply ${topic} with a worked example`;
  return {
    topic,
    scorePercent,
    answeredQuestions: latest.length,
    strongConcepts,
    needsRevision,
    recommendation: needsRevision.length > 0
      ? `Revisit ${needsRevision.map((item) => item.concept).join(", ")} with one simple example, then try another short answer.`
      : `You showed a solid grasp of the assessed concepts. Strengthen it by applying ${topic} to a new example.`,
    suggestedNextTopic,
  };
}
