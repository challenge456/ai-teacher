import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  createTeachingEngine,
  TeachingEngineError,
} from "@/teaching";
import type { SourceCitation } from "@/teaching";
import { prisma } from "@/db/client";
import { lessonInclude, lessonToCreateData, toPersistedLesson } from "@/lessons/session";
import { groundedContext, retrieveRelevantChunks, toCitations } from "@/documents/retrieval";

/**
 * POST /api/lessons
 *
 * Accepts topic + learner profile, returns a validated LessonPlan.
 * Phase 2A uses the mock provider; no API key required.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const engine = createTeachingEngine("auto");
    let documentId: string | undefined;
    let citations: SourceCitation[] = [];
    let enrichedBody = body;
    if (typeof body.documentId === "string") {
      const document = await prisma.learningDocument.findUnique({
        where: { id: body.documentId },
        include: { chunks: { select: { id: true, order: true, content: true }, orderBy: { order: "asc" } } },
      });
      if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
      const query = `${body.topic ?? ""} ${body.learner?.objective ?? ""}`;
      const retrieved = retrieveRelevantChunks(document.chunks, query);
      const selected = retrieved.length > 0 ? retrieved : document.chunks.slice(0, 3).map((chunk) => ({ ...chunk, score: 0 }));
      citations = toCitations(document, selected);
      documentId = document.id;
      enrichedBody = { ...body, context: groundedContext(citations), documentId };
    }
    const lesson = await engine.generateLesson(enrichedBody);
    const groundedLesson = citations.length === 0
      ? lesson
      : { ...lesson, sections: lesson.sections.map((section) => ({ ...section, sourceCitations: citations })) };
    const studentId = typeof body.studentId === "string" ? body.studentId : undefined;
    if (studentId) {
      await prisma.studentProfile.upsert({
        where: { id: studentId },
        create: { id: studentId, learnerProfile: lesson.learner },
        update: { learnerProfile: lesson.learner },
      });
    }
    const stored = await prisma.lesson.create({
      data: lessonToCreateData(groundedLesson, documentId, studentId),
      include: lessonInclude,
    });
    return NextResponse.json(toPersistedLesson(stored), { status: 201 });
  } catch (error) {
    if (error instanceof TeachingEngineError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error("Unexpected error in POST /api/lessons:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
