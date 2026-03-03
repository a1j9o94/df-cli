/**
 * Utility functions for the `dark research video` command.
 *
 * Handles running llm-youtube CLI commands and formatting
 * research artifacts from video transcripts and Q&A results.
 */

import { execSync } from "node:child_process";

/**
 * Run `llm-youtube transcript -v <url>` and return the raw transcript text.
 * Throws on non-zero exit code.
 */
export function runLlmYoutubeTranscript(url: string): string {
  const result = execSync(`llm-youtube transcript -v "${url}"`, {
    encoding: "utf-8",
    timeout: 120_000,
  });
  return result.trim();
}

/**
 * Run `llm-youtube ask -v <url> "<question>"` and return the answer text.
 * Throws on non-zero exit code.
 */
export function runLlmYoutubeAsk(url: string, question: string): string {
  // Escape double quotes in the question
  const escapedQuestion = question.replace(/"/g, '\\"');
  const result = execSync(
    `llm-youtube ask -v "${url}" "${escapedQuestion}"`,
    {
      encoding: "utf-8",
      timeout: 180_000,
    }
  );
  return result.trim();
}

/**
 * Run `llm-youtube info -v <url>` and return the parsed JSON metadata.
 * Returns null if the command fails (info is optional).
 */
export function runLlmYoutubeInfo(
  url: string
): { title?: string; duration?: string } | null {
  try {
    const result = execSync(`llm-youtube info -v "${url}"`, {
      encoding: "utf-8",
      timeout: 30_000,
    });
    return JSON.parse(result);
  } catch {
    return null;
  }
}

/**
 * Build a human-readable label for a video research artifact.
 *
 * - With title: "Video: <title>"
 * - With title + question: "Video Q&A: <title>"
 * - Without title: "Video: <url>"
 * - Without title + question: "Video Q&A: <url>"
 */
export function buildVideoResearchLabel(
  url: string,
  title?: string,
  question?: string
): string {
  const prefix = question ? "Video Q&A" : "Video";
  const identifier = title || url;
  return `${prefix}: ${identifier}`;
}

/**
 * Build markdown content for a transcript research artifact.
 */
export function buildTranscriptContent(
  url: string,
  transcript: string
): string {
  return [
    `# Video Transcript`,
    "",
    `**Source:** ${url}`,
    "",
    "## Transcript",
    "",
    transcript,
  ].join("\n");
}

/**
 * Build markdown content for a Q&A research artifact.
 */
export function buildQAContent(
  url: string,
  question: string,
  answer: string
): string {
  return [
    `# Video Q&A`,
    "",
    `**Source:** ${url}`,
    "",
    `## Question`,
    "",
    question,
    "",
    `## Answer`,
    "",
    answer,
  ].join("\n");
}
