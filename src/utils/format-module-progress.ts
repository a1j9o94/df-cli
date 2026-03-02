import type { ModuleProgressEntry } from "../db/queries/status-queries.js";
import { formatElapsed } from "./time-format.js";

/**
 * Format module progress entries as a compact inline string for status display.
 * Example: "parser(done) lexer(building 12m 34s) codegen(pending)"
 */
export function formatModuleProgressInline(entries: ModuleProgressEntry[]): string {
  if (entries.length === 0) return "";

  return entries.map(entry => {
    const id = entry.moduleId;

    switch (entry.status) {
      case "completed":
        return `${id}(done)`;
      case "running":
      case "spawning":
        return `${id}(building ${formatElapsed(entry.elapsedMs)})`;
      case "failed":
        return `${id}(failed)`;
      case "killed":
        return `${id}(killed)`;
      case "pending":
      default:
        return `${id}(pending)`;
    }
  }).join(" ");
}
