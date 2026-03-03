/**
 * Core action logic for `dark research video`.
 *
 * Separated from the Commander command definition so it can be
 * tested with mock functions for llm-youtube subprocess calls.
 */

import type { SqliteDb } from "../../db/index.js";
import type { ResearchArtifactRecord } from "../../types/index.js";
import { getAgent } from "../../db/queries/agents.js";
import { createResearchArtifact } from "../../db/queries/research.js";
import {
  runLlmYoutubeTranscript,
  runLlmYoutubeAsk,
  runLlmYoutubeInfo,
  buildVideoResearchLabel,
  buildTranscriptContent,
  buildQAContent,
} from "./video-utils.js";

/**
 * Options for executing video research.
 *
 * The _transcriptFn, _askFn, and _infoFn parameters are test hooks
 * that allow mocking the llm-youtube subprocess calls.
 */
export interface VideoResearchOptions {
  url: string;
  question?: string;
  module?: string;
  /** @internal Test hook: override transcript fetching */
  _transcriptFn?: (url: string) => string;
  /** @internal Test hook: override Q&A */
  _askFn?: (url: string, question: string) => string;
  /** @internal Test hook: override info fetching */
  _infoFn?: (url: string) => { title?: string; duration?: string } | null;
}

/**
 * Execute the video research pipeline:
 *
 * 1. Optionally fetch video info (for the label)
 * 2. If --question: run ask mode; else: fetch transcript
 * 3. Save as research artifact
 *
 * Does NOT validate URLs — passes them through to llm-youtube.
 */
export function executeVideoResearch(
  db: SqliteDb,
  agentId: string,
  options: VideoResearchOptions
): ResearchArtifactRecord {
  const { url, question, module: moduleId } = options;

  // Resolve function implementations (real or test mock)
  const getTranscript = options._transcriptFn ?? runLlmYoutubeTranscript;
  const askQuestion = options._askFn ?? runLlmYoutubeAsk;
  const getInfo = options._infoFn ?? runLlmYoutubeInfo;

  // Look up the agent to get the run_id
  const agent = getAgent(db, agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // Step 1: Try to get video info for a better label (optional, non-fatal)
  const info = getInfo(url);
  const title = info?.title;

  // Step 2: Get content based on mode
  let content: string;
  let label: string;

  if (question) {
    // Q&A mode
    const answer = askQuestion(url, question);
    content = buildQAContent(url, question, answer);
    label = buildVideoResearchLabel(url, title, question);
  } else {
    // Transcript mode
    const transcript = getTranscript(url);
    content = buildTranscriptContent(url, transcript);
    label = buildVideoResearchLabel(url, title);
  }

  // Step 3: Save as research artifact
  return createResearchArtifact(db, {
    run_id: agent.run_id,
    agent_id: agentId,
    label,
    type: "text",
    content,
    module_id: moduleId,
  });
}
