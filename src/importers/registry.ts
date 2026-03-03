import type { IssueImporter } from "./types.js";

/**
 * Registry for issue importers. Allows registering importers and resolving
 * which importer can handle a given URL.
 *
 * Adding a new importer requires:
 * 1. Implementing the IssueImporter interface
 * 2. Registering it with the registry via register()
 * 3. Adding the CLI flag in the command
 *
 * No changes to spec generation logic are needed.
 */
export class ImporterRegistry {
  private importers: IssueImporter[] = [];

  /**
   * Register a new importer. Throws if an importer with the same name
   * is already registered.
   */
  register(importer: IssueImporter): void {
    const existing = this.importers.find((i) => i.name === importer.name);
    if (existing) {
      throw new Error(
        `Importer "${importer.name}" is already registered. Each importer must have a unique name.`,
      );
    }
    this.importers.push(importer);
  }

  /**
   * Find the first importer that can handle the given URL.
   * Returns null if no importer matches.
   */
  resolve(url: string): IssueImporter | null {
    for (const importer of this.importers) {
      if (importer.canHandle(url)) {
        return importer;
      }
    }
    return null;
  }

  /**
   * Get a specific importer by name. Returns null if not found.
   */
  getImporter(name: string): IssueImporter | null {
    return this.importers.find((i) => i.name === name) ?? null;
  }

  /**
   * List all registered importer names.
   */
  listImporters(): string[] {
    return this.importers.map((i) => i.name);
  }
}
