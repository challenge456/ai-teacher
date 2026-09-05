import { NextResponse } from "next/server";
import { prisma } from "@/db/client";
import { DocumentIngestionError, extractDocumentText } from "@/documents/ingest";
import { chunkText } from "@/documents/retrieval";

export const runtime = "nodejs";

/** POST multipart/form-data with a `file`; stores extracted text and chunks, never the original binary. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const form = await request.formData();
    const candidate = form.get("file");
    if (!(candidate instanceof File)) return NextResponse.json({ error: "Attach a file in the `file` field" }, { status: 400 });
    const extracted = await extractDocumentText(candidate);
    const chunks = chunkText(extracted.text);
    const document = await prisma.learningDocument.create({
      data: {
        name: candidate.name,
        mimeType: extracted.mimeType,
        sizeBytes: candidate.size,
        text: extracted.text,
        chunks: { create: chunks.map((chunk, order) => ({ order, ...chunk })) },
      },
      include: { chunks: { select: { id: true, order: true, content: true } } },
    });
    return NextResponse.json({ id: document.id, name: document.name, chunkCount: document.chunks.length, preview: document.chunks[0]?.content.slice(0, 300) ?? "" }, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentIngestionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Unexpected error in POST /api/documents:", error);
    return NextResponse.json({ error: "Unable to process this document" }, { status: 500 });
  }
}
