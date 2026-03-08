export type ResearchArtifactType = "text" | "file";

export interface ResearchArtifactRecord {
  id: string;
  run_id: string;
  agent_id: string;
  label: string;
  type: ResearchArtifactType;
  content: string | null;
  file_path: string | null;
  module_id: string | null;
  created_at: string;
}

export interface ResearchArtifactCreateInput {
  run_id: string;
  agent_id: string;
  label: string;
  type: ResearchArtifactType;
  content?: string;
  file_path?: string;
  module_id?: string;
}

/**
 * Options for executing video research via `dark research video`.
 *
 * This is an interface contract — builders and other modules should
 * import this type from `types/index.js`.
 */
export interface VideoResearchOptions {
  /** Video URL (YouTube, Loom, or any URL supported by llm-youtube) */
  url: string;
  /** Optional question to ask about the video (Q&A mode) */
  question?: string;
  /** Optional module ID to tag the research artifact */
  module?: string;
  /** @internal Test hook: override transcript fetching */
  _transcriptFn?: (url: string) => string;
  /** @internal Test hook: override Q&A */
  _askFn?: (url: string, question: string) => string;
  /** @internal Test hook: override info fetching */
  _infoFn?: (url: string) => { title?: string; duration?: string } | null;
}
