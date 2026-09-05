"use client";

import { useEffect, useState } from "react";
import type {
  GenerateLessonRequest,
  LessonPlan,
  LearnerProfile,
  AnswerResponse,
} from "@/teaching/schemas";
import type { LearningReport } from "@/lessons/report";
import { TeacherPresenter } from "@/components/teacher-presenter";
import { LearnerAccess, type LearnerIdentity } from "@/components/learner-access";
import { LessonVisual } from "@/components/lesson-visual";
import { SourceGrounding } from "@/components/source-grounding";

const DEFAULT_LEARNER: LearnerProfile = {
  level: "intermediate",
  knownTopics: [],
  objective: "Understand the core concept and apply it to a simple example",
  teachingStyle: "direct",
  language: "en",
  availableMinutes: 15,
  preferredDepth: "standard",
};

type TeachingState = "form" | "lesson-overview" | "teaching" | "question" | "evaluating" | "adaptation" | "complete";

type PersistedLessonResponse = {
  lessonId: string;
  lesson: LessonPlan;
  session: {
    currentSection: number;
    currentAttempt: number;
    state: TeachingState;
    lastResponse?: AnswerResponse;
  };
};

type ConceptProgress = { topic: string; concept: string; mastery: number; attempts: number };

const RESUME_LESSON_KEY = "ai-teacher-lesson-id";
const STUDENT_ID_KEY = "ai-teacher-student-id";

function getGuestStudentId(): string {
  const existing = window.localStorage.getItem(STUDENT_ID_KEY);
  if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(STUDENT_ID_KEY, created);
  return created;
}

export default function ClassroomPage() {
  const [topic, setTopic] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<{ id: string; name: string; chunkCount: number } | null>(null);
  const [learner, setLearner] = useState<LearnerProfile>(DEFAULT_LEARNER);
  const [lesson, setLesson] = useState<LessonPlan | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [state, setState] = useState<TeachingState>("form");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [lastEvaluation, setLastEvaluation] = useState<AnswerResponse | null>(null);
  const [report, setReport] = useState<LearningReport | null>(null);
  const [recentProgress, setRecentProgress] = useState<ConceptProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [learnerIdentity, setLearnerIdentity] = useState<LearnerIdentity | null>(null);
  const [guestStudentId, setGuestStudentId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setGuestStudentId(getGuestStudentId()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const savedLessonId = window.localStorage.getItem(RESUME_LESSON_KEY);
    if (!savedLessonId) return;

    void (async () => {
      try {
        const response = await fetch(`/api/lessons/${savedLessonId}`);
        if (!response.ok) {
          window.localStorage.removeItem(RESUME_LESSON_KEY);
          return;
        }
        const data: PersistedLessonResponse = await response.json();
        setLessonId(data.lessonId);
        setLesson(data.lesson);
        setCurrentSectionIndex(data.session.currentSection);
        setAttemptNumber(data.session.currentAttempt);
        setLastEvaluation(data.session.lastResponse ?? null);
        setState(data.session.state);
      } catch {
        // A new lesson can still be started when the saved session is unavailable.
      }
    })();
  }, []);

  async function updateSessionState(nextState: TeachingState, continueFromAnswer = false, currentSection?: number) {
    if (!lessonId) {
      setState(nextState);
      return;
    }

    const response = await fetch(`/api/lessons/${lessonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: nextState, continueFromAnswer, currentSection }),
    });
    if (!response.ok) throw new Error("Failed to save lesson progress");
    const data: PersistedLessonResponse = await response.json();
    setCurrentSectionIndex(data.session.currentSection);
    setAttemptNumber(data.session.currentAttempt);
    setState(nextState);
  }

  async function handleGenerate() {
    if (!topic.trim()) {
      setError("Topic is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body: GenerateLessonRequest = {
        topic: topic.trim(),
        learner,
        ...(selectedDocument ? { documentId: selectedDocument.id } : {}),
        studentId: learnerIdentity?.id ?? guestStudentId ?? getGuestStudentId(),
      };

      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const fieldErrors = data.details?.fieldErrors
          ? Object.entries(data.details.fieldErrors as Record<string, string[]>).map(([field, messages]) => `${field}: ${messages.join(", ")}`).join("; ")
          : "";
        setError([data.error || "Failed to generate lesson", fieldErrors].filter(Boolean).join(" — "));
        return;
      }

      const persisted: PersistedLessonResponse = data;
      setLessonId(persisted.lessonId);
      window.localStorage.setItem(RESUME_LESSON_KEY, persisted.lessonId);
      setLesson(persisted.lesson);
      setCurrentSectionIndex(0);
      setAttemptNumber(1);
      setState("lesson-overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDocumentUpload(file: File | null) {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to process this document");
      setSelectedDocument({ id: data.id, name: data.name, chunkCount: data.chunkCount });
      if (!topic.trim()) setTopic(file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to process this document");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartTeaching() {
    try {
      await updateSessionState("teaching");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleSubmitAnswer() {
    if (!lesson || !answer.trim()) {
      setError("Please enter an answer");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const section = lesson.sections[currentSectionIndex];
      if (!lessonId) throw new Error("Lesson session is not available");
      const response = await fetch(`/api/lessons/${lessonId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: section.id,
          answer: answer.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          (data as { error?: string }).error ||
            "Failed to evaluate answer",
        );
        return;
      }

      setLastEvaluation(data as AnswerResponse);
      setAnswer("");

      if ((data as AnswerResponse).evaluation.verdict === "correct") {
        setState("adaptation");
      } else if ((data as AnswerResponse).adaptation) {
        setState("adaptation");
      } else {
        setState("question");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    if (!lastEvaluation) return;

    if (lastEvaluation.nextAction === "complete") {
      await updateSessionState("complete", true);
      return;
    }

    if (lastEvaluation.nextAction === "advance") {
      if (currentSectionIndex < lesson!.sections.length - 1) {
        await updateSessionState("teaching", true);
      } else {
        await updateSessionState("complete", true);
      }
      return;
    }

    if (lastEvaluation.nextAction === "retry") {
      await updateSessionState("question", true);
      return;
    }
  }

  async function handleSectionContinue() {
    if (!lesson) return;
    try {
      if (currentSectionIndex >= lesson.sections.length - 1) {
        await updateSessionState("complete");
        return;
      }
      await updateSessionState("teaching", false, currentSectionIndex + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save lesson progress");
    }
  }

  useEffect(() => {
    if (state !== "complete" || !lessonId || report) return;
    void (async () => {
      try {
        const response = await fetch(`/api/lessons/${lessonId}/report`);
        if (response.ok) {
          setReport(await response.json());
          const currentStudentId = learnerIdentity?.id ?? guestStudentId ?? getGuestStudentId();
          const progressResponse = await fetch(`/api/students/${currentStudentId}/progress`);
          if (progressResponse.ok) setRecentProgress((await progressResponse.json()).progress);
        }
      } catch {
        // Completion still works if the optional report request is unavailable.
      }
    })();
  }, [state, lessonId, report, learnerIdentity?.id, guestStudentId]);

  if (state === "form") {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-zinc-50">
            AI Teacher – Classroom
          </h1>

          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6 mb-6 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-50">
              Create a New Lesson
            </h2>

            <div className="space-y-4">
              {guestStudentId && <LearnerAccess guestId={guestStudentId} onChange={setLearnerIdentity} />}
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                  Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Photosynthesis"
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                    Level
                  </label>
                  <select
                    value={learner.level}
                    onChange={(e) =>
                      setLearner({
                        ...learner,
                        level: e.target.value as LearnerProfile["level"],
                      })
                    }
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="elementary">Elementary</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                    Teaching Style
                  </label>
                  <select
                    value={learner.teachingStyle}
                    onChange={(e) =>
                      setLearner({
                        ...learner,
                        teachingStyle: e.target
                          .value as LearnerProfile["teachingStyle"],
                      })
                    }
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="direct">Direct</option>
                    <option value="socratic">Socratic</option>
                    <option value="storytelling">Storytelling</option>
                    <option value="worked-example">Worked Example</option>
                    <option value="inquiry">Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                    Teaching Language
                  </label>
                  <select
                    value={learner.language}
                    onChange={(e) => setLearner({ ...learner, language: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="hi-IN">Hindi</option>
                    <option value="en-IN">Hinglish</option>
                  </select>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">The teacher voice uses this language setting; a configured LLM also writes the lesson in it.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                    Available Minutes
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={learner.availableMinutes}
                    onChange={(e) => {
                      const minutes = Number(e.target.value);
                      setLearner({ ...learner, availableMinutes: Number.isFinite(minutes) ? Math.min(180, Math.max(5, Math.round(minutes))) : DEFAULT_LEARNER.availableMinutes });
                    }}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                    Depth
                  </label>
                  <select
                    value={learner.preferredDepth}
                    onChange={(e) =>
                      setLearner({
                        ...learner,
                        preferredDepth: e.target
                          .value as LearnerProfile["preferredDepth"],
                      })
                    }
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="overview">Overview</option>
                    <option value="standard">Standard</option>
                    <option value="deep">Deep</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                  Objective
                </label>
                <textarea
                  value={learner.objective}
                  onChange={(e) =>
                    setLearner({ ...learner, objective: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                  Learning material (optional)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown"
                  onChange={(event) => void handleDocumentUpload(event.target.files?.[0] ?? null)}
                  disabled={loading}
                  className="block w-full text-sm text-zinc-700 dark:text-zinc-300 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-200"
                />
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">PDF, DOCX, PPTX, TXT, or Markdown — up to 10 MB.</p>
                {selectedDocument && <p className="mt-2 text-sm text-green-700 dark:text-green-300">Ready: {selectedDocument.name} ({selectedDocument.chunkCount} source chunks)</p>}
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
              >
                {loading ? "Generating..." : "Generate Lesson"}
              </button>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === "lesson-overview" && lesson) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-zinc-50">
            {lesson.topic}
          </h1>

          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6 border border-zinc-200 dark:border-zinc-800">
            <p className="text-lg mb-6 text-zinc-700 dark:text-zinc-300">
              {lesson.objective}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {lesson.sections.length}
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200">Concepts to learn</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ~{lesson.estimatedMinutes}min
                </div>
                <div className="text-sm text-green-800 dark:text-green-200">Estimated time</div>
              </div>
            </div>

            <div className="mb-8"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Your learning path</h3><span className="text-sm text-zinc-500">5 guided steps</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{lesson.sections.map((section, index) => <article key={section.id} className="min-h-36 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"><span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{index + 1}</span><p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{section.concept}</p></article>)}</div></div>

            <button
              onClick={handleStartTeaching}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
            >
              Start Learning
            </button>
          </div>
        </div>
      </div>
    );
  }

  if ((state === "teaching" || state === "adaptation") && lesson && lesson.sections[currentSectionIndex]) {
    const section = lesson.sections[currentSectionIndex];

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Your adaptive lesson</p><h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {lesson.topic}
            </h1></div>
            <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-600 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">Step {currentSectionIndex + 1} <span className="text-zinc-400">/</span> {lesson.sections.length}</div>
          </div>

          <div className="mb-8 grid grid-cols-5 gap-2">{lesson.sections.map((item,index)=><div key={item.id} className={`h-2 rounded-full ${index <= currentSectionIndex ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-800"}`} aria-label={`Lesson step ${index + 1}`} />)}</div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 sm:p-8">
            {state === "teaching" && (
              <>
                <TeacherPresenter script={section.spokenScript} language={section.language} concept={section.concept} />

                <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-700"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Today’s idea</p><h2 className="mt-2 text-2xl font-bold text-zinc-950 dark:text-zinc-50">{section.concept}</h2><p className="mt-5 max-w-none text-base leading-8 text-zinc-700 dark:text-zinc-300">{section.explanation}</p></div>
                <div className="mt-7">{section.visualContent && <LessonVisual type={section.visualType} content={section.visualContent} title={section.concept} />}</div>
                <div className="mt-7"><SourceGrounding citations={section.sourceCitations} /></div>

                <div className="mt-8">

                  {section.question ? (
                    <button
                      onClick={() => void updateSessionState("question")}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors"
                    >
                      Next: Answer the Question
                    </button>
                  ) : (
                    <button
                      onClick={handleSectionContinue}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
                    >
                      Continue
                    </button>
                  )}
                </div>
              </>
            )}

            {state === "adaptation" && lastEvaluation && (
              <>
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-50 mb-2">
                    Your answer: {lastEvaluation.evaluation.verdict === "correct" ? "✓ Correct!" : "Needs refinement"}
                  </h3>
                  <p className="text-amber-800 dark:text-amber-200">
                    {lastEvaluation.evaluation.feedback}
                  </p>
                </div>

                {lastEvaluation.adaptation && (
                  <>
                    <div className="space-y-6 mb-6">
                      <div>
                        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50 mb-2">
                          {lastEvaluation.evaluation.verdict === "correct"
                            ? "Great work!"
                            : "Let me clarify..."}
                        </h3>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {lastEvaluation.adaptation.explanation}
                        </p>
                      </div>

                      {lastEvaluation.adaptation.visualContent && (
                        <div>
                          <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50 mb-2">
                            Visual Aid ({lastEvaluation.adaptation.visualType})
                          </h3>
                          <pre className="text-sm bg-zinc-100 dark:bg-zinc-800 p-4 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                            {lastEvaluation.adaptation.visualContent}
                          </pre>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <button
                  onClick={handleContinue}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
                >
                  {lastEvaluation.nextAction === "complete"
                    ? "Lesson Complete!"
                    : lastEvaluation.nextAction === "advance"
                      ? "Continue to Next Concept"
                      : "Try Again"}
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state === "question" && lesson && lesson.sections[currentSectionIndex]) {
    const section = lesson.sections[currentSectionIndex];
    if (!section.question) {
      setState("teaching");
      return null;
    }

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {lesson.topic}
            </h1>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Attempt {attemptNumber} / 3
            </div>
          </div>

          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 mb-8">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${((currentSectionIndex + 1) / lesson.sections.length) * 100}%`,
              }}
            />
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-50">
              Question
            </h2>

            <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-6">
              {section.question.prompt}
            </p>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            <button
              onClick={handleSubmitAnswer}
              disabled={loading || !answer.trim()}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors"
            >
              {loading ? "Evaluating..." : "Submit Answer"}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state === "complete" && lesson) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8 border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">
              Lesson Complete!
            </h1>
            <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-8">
              You have successfully learned about {lesson.topic}. Great work!
            </p>

            <div className="p-6 bg-blue-50 dark:bg-blue-950 rounded mb-8">
              <h3 className="font-semibold text-blue-900 dark:text-blue-50 mb-3">
                Concepts Learned:
              </h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {lesson.concepts.map((concept: string) => (
                  <span
                    key={concept}
                    className="px-3 py-1 bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-full"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>

            {report && (
              <div className="mb-8 space-y-4 text-left">
                <div className="rounded bg-emerald-50 p-5 dark:bg-emerald-950">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Learning report</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-900 dark:text-emerald-50">{report.scorePercent}%</p>
                  <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">Based on {report.answeredQuestions} assessed concept{report.answeredQuestions === 1 ? "" : "s"}.</p>
                </div>
                {report.strongConcepts.length > 0 && <div><h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Strong areas</h3><p className="text-zinc-700 dark:text-zinc-300">{report.strongConcepts.join(", ")}</p></div>}
                {report.needsRevision.length > 0 && <div><h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Review next</h3><ul className="list-disc pl-5 text-zinc-700 dark:text-zinc-300">{report.needsRevision.map((item) => <li key={item.concept}><span className="font-medium">{item.concept}:</span> {item.reason}</li>)}</ul></div>}
                <div><h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Recommendation</h3><p className="text-zinc-700 dark:text-zinc-300">{report.recommendation}</p><p className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-300">Suggested next: {report.suggestedNextTopic}</p></div>
              </div>
            )}

            {recentProgress.length > 0 && (
              <div className="mb-8 rounded border border-zinc-200 p-5 text-left dark:border-zinc-700">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Your learning progress</h3>
                <div className="mt-3 space-y-3">
                  {recentProgress.slice(0, 4).map((item) => (
                    <div key={`${item.topic}-${item.concept}`}>
                      <div className="flex justify-between gap-3 text-sm text-zinc-700 dark:text-zinc-300"><span>{item.concept}</span><span>{Math.round(item.mastery * 100)}%</span></div>
                      <div className="mt-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.round(item.mastery * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                window.localStorage.removeItem(RESUME_LESSON_KEY);
                setTopic("");
                setLessonId(null);
                setLesson(null);
                setReport(null);
                setRecentProgress([]);
                setState("form");
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
            >
              Learn Another Topic
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
