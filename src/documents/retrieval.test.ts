import { describe, expect, it } from "vitest";
import { chunkText, groundedContext, retrieveRelevantChunks, toCitations } from "./retrieval";

describe("document retrieval", () => {
  it("chunks text with useful overlap", () => {
    const chunks = chunkText("photosynthesis needs sunlight chlorophyll and carbon dioxide. ".repeat(50), 120, 20);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0].content).toContain("photosynthesis");
    expect(chunks[1].characterStart).toBeLessThan(chunks[0].characterEnd);
  });

  it("retrieves relevant chunks and produces traceable source context", () => {
    const chunks = [
      { id: "a", order: 0, content: "Plants use sunlight to make glucose during photosynthesis." },
      { id: "b", order: 1, content: "Volcanoes form when magma reaches the surface." },
    ];
    const matches = retrieveRelevantChunks(chunks, "Teach photosynthesis and sunlight");
    expect(matches.map((chunk) => chunk.id)).toEqual(["a"]);
    const citations = toCitations({ id: "doc-1", name: "Biology notes" }, matches);
    expect(citations[0]).toMatchObject({ documentId: "doc-1", chunkId: "a", chunkOrder: 0 });
    expect(groundedContext(citations)).toContain("Biology notes");
  });
});
