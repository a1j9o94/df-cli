import type { SqliteDb } from "../index.js";
import type { ContractRecord, ContractBindingRecord, BuilderDependencyRecord } from "../../types/index.js";
import { newContractId, newBindingId, newDepId } from "../../utils/id.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

// --- Contracts ---

export function createContract(
  db: SqliteDb,
  runId: string,
  buildplanId: string,
  name: string,
  description: string,
  format: string,
  content: string,
): ContractRecord {
  const id = newContractId();
  const ts = now();

  db.prepare(
    `INSERT INTO contracts (id, run_id, buildplan_id, name, description, format, content, version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(id, runId, buildplanId, name, description, format, content, ts, ts);

  return getContract(db, id)!;
}

export function getContract(db: SqliteDb, id: string): ContractRecord | null {
  return db.prepare("SELECT * FROM contracts WHERE id = ?").get(id) as ContractRecord | null;
}

export function listContracts(db: SqliteDb, runId?: string, buildplanId?: string): ContractRecord[] {
  if (runId && buildplanId) {
    return db.prepare(
      "SELECT * FROM contracts WHERE run_id = ? AND buildplan_id = ? ORDER BY created_at"
    ).all(runId, buildplanId) as ContractRecord[];
  }
  if (runId) {
    return db.prepare("SELECT * FROM contracts WHERE run_id = ? ORDER BY created_at").all(runId) as ContractRecord[];
  }
  if (buildplanId) {
    return db.prepare("SELECT * FROM contracts WHERE buildplan_id = ? ORDER BY created_at").all(buildplanId) as ContractRecord[];
  }
  return db.prepare("SELECT * FROM contracts ORDER BY created_at").all() as ContractRecord[];
}

export function updateContractContent(
  db: SqliteDb,
  id: string,
  content: string,
  _reason: string,
): void {
  db.prepare(
    "UPDATE contracts SET content = ?, version = version + 1, updated_at = ? WHERE id = ?"
  ).run(content, now(), id);
}

// --- Bindings ---

export function createBinding(
  db: SqliteDb,
  contractId: string,
  agentId: string,
  moduleId: string,
  role: "implementer" | "consumer",
): ContractBindingRecord {
  const id = newBindingId();
  const ts = now();

  db.prepare(
    `INSERT INTO contract_bindings (id, contract_id, agent_id, module_id, role, acknowledged, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  ).run(id, contractId, agentId, moduleId, role, ts);

  return getBinding(db, id)!;
}

function getBinding(db: SqliteDb, id: string): ContractBindingRecord | null {
  const row = db.prepare("SELECT * FROM contract_bindings WHERE id = ?").get(id) as Record<string, unknown> | null;
  if (!row) return null;
  return { ...row, acknowledged: row.acknowledged === 1 } as unknown as ContractBindingRecord;
}

export function acknowledgeContract(db: SqliteDb, contractId: string, agentId: string): void {
  const ts = now();
  db.prepare(
    "UPDATE contract_bindings SET acknowledged = 1, acknowledged_at = ? WHERE contract_id = ? AND agent_id = ?"
  ).run(ts, contractId, agentId);
}

export function getBindingsForAgent(db: SqliteDb, agentId: string): ContractBindingRecord[] {
  const rows = db.prepare(
    "SELECT * FROM contract_bindings WHERE agent_id = ? ORDER BY created_at"
  ).all(agentId) as Record<string, unknown>[];
  return rows.map((r) => ({ ...r, acknowledged: r.acknowledged === 1 }) as unknown as ContractBindingRecord);
}

export function getBindingsForContract(db: SqliteDb, contractId: string): ContractBindingRecord[] {
  const rows = db.prepare(
    "SELECT * FROM contract_bindings WHERE contract_id = ? ORDER BY created_at"
  ).all(contractId) as Record<string, unknown>[];
  return rows.map((r) => ({ ...r, acknowledged: r.acknowledged === 1 }) as unknown as ContractBindingRecord);
}

// --- Builder Dependencies ---

export function createDependency(
  db: SqliteDb,
  runId: string,
  builderId: string,
  dependsOnModuleId: string,
  type: string,
  dependsOnBuilderId?: string,
): BuilderDependencyRecord {
  const id = newDepId();
  const ts = now();

  db.prepare(
    `INSERT INTO builder_dependencies (id, run_id, builder_id, depends_on_builder_id, depends_on_module_id, dependency_type, satisfied, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(id, runId, builderId, dependsOnBuilderId ?? null, dependsOnModuleId, type, ts);

  return getDependency(db, id)!;
}

function getDependency(db: SqliteDb, id: string): BuilderDependencyRecord | null {
  const row = db.prepare("SELECT * FROM builder_dependencies WHERE id = ?").get(id) as Record<string, unknown> | null;
  if (!row) return null;
  return {
    ...row,
    satisfied: row.satisfied === 1,
    dependency_type: row.dependency_type as "completion" | "contract" | "artifact",
  } as unknown as BuilderDependencyRecord;
}

export function satisfyDependency(db: SqliteDb, id: string): void {
  db.prepare(
    "UPDATE builder_dependencies SET satisfied = 1, satisfied_at = ? WHERE id = ?"
  ).run(now(), id);
}

export function getDependenciesForBuilder(db: SqliteDb, builderId: string): BuilderDependencyRecord[] {
  const rows = db.prepare(
    "SELECT * FROM builder_dependencies WHERE builder_id = ? ORDER BY created_at"
  ).all(builderId) as Record<string, unknown>[];
  return rows.map((r) => ({
    ...r,
    satisfied: r.satisfied === 1,
    dependency_type: r.dependency_type as "completion" | "contract" | "artifact",
  }) as unknown as BuilderDependencyRecord);
}

export function getUnsatisfiedDependencies(db: SqliteDb, builderId: string): BuilderDependencyRecord[] {
  const rows = db.prepare(
    "SELECT * FROM builder_dependencies WHERE builder_id = ? AND satisfied = 0 ORDER BY created_at"
  ).all(builderId) as Record<string, unknown>[];
  return rows.map((r) => ({
    ...r,
    satisfied: false,
    dependency_type: r.dependency_type as "completion" | "contract" | "artifact",
  }) as unknown as BuilderDependencyRecord);
}
