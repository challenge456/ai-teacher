import { MockTeachingProvider } from "./mock-provider";
import { ClaudeTeachingProvider } from "./claude-provider";
import type { TeachingModelProvider } from "./provider";
import { TeachingEngine } from "./engine";

export type TeachingProviderId = "mock" | "claude";

/**
 * Provider factory.
 *
 * Selects provider based on environment:
 * - If ANTHROPIC_API_KEY is set → Claude provider
 * - Otherwise → Mock provider
 *
 * Callers must not construct providers themselves.
 */
export function createTeachingProvider(
  id?: TeachingProviderId | "auto",
): TeachingModelProvider {
  // Auto-detect based on API key if not explicitly specified
  if (id === "auto" || !id) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      return new ClaudeTeachingProvider(apiKey);
    }
    return new MockTeachingProvider();
  }

  switch (id) {
    case "mock":
      return new MockTeachingProvider();
    case "claude": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      return new ClaudeTeachingProvider(apiKey);
    }
    default: {
      const _exhaustive: never = id;
      throw new Error(`Unsupported teaching provider: ${_exhaustive}`);
    }
  }
}

export function createTeachingEngine(
  id?: TeachingProviderId | "auto",
): TeachingEngine {
  return new TeachingEngine(createTeachingProvider(id));
}
