import mammoth from "mammoth";
import JSZip from "jszip";
import { PDFParse } from "pdf-parse";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  "pdf",
  "docx",
  "pptx",
  "txt",
  "md",
] as const;

export class DocumentIngestionError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "DocumentIngestionError";
  }
}

function extensionOf(name: string): string {
  return name.toLowerCase().split(".").pop() ?? "";
}

function decodeXml(value: string): string {
  return value
    .replace(/<a:br\s*\/?\s*>/g, "\n")
    .replace(/<\/a:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function textFromPptx(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  const names = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort(
      (a, b) =>
        Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]),
    );

  const slides = await Promise.all(
    names.map(async (name) =>
      decodeXml(await zip.file(name)!.async("string")),
    ),
  );

  return slides.join("\n\n");
}

/** Extract text only; original upload storage can be added without changing retrieval. */
export async function extractDocumentText(
  file: File,
): Promise<{ text: string; mimeType: string }> {
  if (!file.name) {
    throw new DocumentIngestionError("A file name is required");
  }

  if (file.size === 0) {
    throw new DocumentIngestionError("The uploaded file is empty");
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new DocumentIngestionError("Files must be 10 MB or smaller");
  }

  const extension = extensionOf(file.name);

  if (
    !SUPPORTED_DOCUMENT_EXTENSIONS.includes(
      extension as (typeof SUPPORTED_DOCUMENT_EXTENSIONS)[number],
    )
  ) {
    throw new DocumentIngestionError(
      "Supported formats are PDF, DOCX, PPTX, TXT, and Markdown",
    );
  }

  const buffer = await file.arrayBuffer();
  let text: string;

  if (extension === "pdf") {
    PDFParse.setWorker(
      pathToFileURL(
        path.join(
          process.cwd(),
          "node_modules",
          "pdf-parse",
          "dist",
          "worker",
          "pdf.worker.mjs",
        ),
      ).href,
    );

    const parser = new PDFParse({
      data: new Uint8Array(buffer),
    });

    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else if (extension === "docx") {
    text = (await mammoth.extractRawText({
      buffer: Buffer.from(buffer),
    })).value;
  } else if (extension === "pptx") {
    text = await textFromPptx(buffer);
  } else {
    text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  }

  const normalized = text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (normalized.length < 20) {
    throw new DocumentIngestionError(
      "No readable text was found in this document",
    );
  }

  return {
    text: normalized,
    mimeType: file.type || `application/${extension}`,
  };
}