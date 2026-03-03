import type { SqliteDb } from "../index.js";
import type {
  ResearchArtifactRecord,
  ResearchArtifactCreateInput,
} from "../../types/index.js";
import { newResearchId } from "../../utils/id.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function createResearchArtifact(
  db: SqliteDb,
  input: ResearchArtifactCreateInput
): ResearchArtifactRecord {
  const id = newResearchId();
  const ts = now();

  db.prepare(
    `INSERT INTO research_artifacts (id, run_id, agent_id, label, type, content, file_path, module_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.run_id,
    input.agent_id,
    input.label,
    input.type,
    input.content ?? null,
    input.file_path ?? null,
    input.module_id ?? null,
    ts
  );

  return getResearchArtifact(db, id)!;
}

export function getResearchArtifact(
  db: SqliteDb,
  id: string
): ResearchArtifactRecord | null {
  return db
    .prepare("SELECT * FROM research_artifacts WHERE id = ?")
    .get(id) as ResearchArtifactRecord | null;
}

export function listResearchArtifacts(
  db: SqliteDb,
  runId: string,
  options?: {
    module_id?: string;
    agent_id?: string;
  }
): ResearchArtifactRecord[] {
  const conditions = ["run_id = ?"];
  const params: string[] = [runId];

  if (options?.module_id) {
    conditions.push("module_id = ?");
    params.push(options.module_id);
  }
  if (options?.agent_id) {
    conditions.push("agent_id = ?");
    params.push(options.agent_id);
  }

  const sql = `SELECT * FROM research_artifacts WHERE ${conditions.join(" AND ")} ORDER BY created_at ASC, rowid ASC`;

  return db.prepare(sql).all(...params) as ResearchArtifactRecord[];
}
