import type { SourceCitation } from "@/teaching";

export type ChunkInput = { id: string; order: number; content: string };
export type RetrievedChunk = ChunkInput & { score: number };

export function chunkText(text: string, chunkSize = 900, overlap = 160): Array<{ content: string; characterStart: number; characterEnd: number }> {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: Array<{ content: string; characterStart: number; characterEnd: number }> = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(clean.length, start + chunkSize);
    if (end < clean.length) {
      const boundary = clean.lastIndexOf(" ", end);
      if (boundary > start + Math.floor(chunkSize * 0.55)) end = boundary;
    }
    const content = clean.slice(start, end).trim();
    if (content) chunks.push({ content, characterStart: start, characterEnd: end });
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

function terms(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu)?.filter((term) => term.length > 2) ?? [];
}

/** Deterministic lexical retrieval keeps this phase portable; an embedding retriever can implement the same contract later. */
export function retrieveRelevantChunks(chunks: ChunkInput[], query: string, limit = 5): RetrievedChunk[] {
  const queryTerms = [...new Set(terms(query))];
  if (queryTerms.length === 0) return chunks.slice(0, limit).map((chunk) => ({ ...chunk, score: 0 }));
  return chunks
    .map((chunk) => {
      const content = chunk.content.toLowerCase();
      const score = queryTerms.reduce((total, term) => total + (content.includes(term) ? 1 : 0), 0);
      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit);
}

export function toCitations(document: { id: string; name: string }, chunks: RetrievedChunk[]): SourceCitation[] {
  return chunks.map((chunk) => ({
    documentId: document.id,
    documentName: document.name,
    chunkId: chunk.id,
    chunkOrder: chunk.order,
    excerpt: chunk.content.slice(0, 500),
  }));
}

export function groundedContext(citations: SourceCitation[], maxLength = 1900): string {
  let context = "Use only the following uploaded source excerpts for factual claims. If they are insufficient, say so.\n";
  for (const citation of citations) {
    const entry = `\n[Source ${citation.chunkOrder + 1}: ${citation.documentName}]\n${citation.excerpt}\n`;
    if (context.length + entry.length > maxLength) break;
    context += entry;
  }
  return context;
}
