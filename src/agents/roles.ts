import type { AgentRole } from "../types/index.js";

export interface RoleDefinition {
  role: AgentRole;
  description: string;
  allowedTools: string[];
  codebaseAccess: "none" | "read-only" | "read-write";
  scenarioAccess: boolean;
  writesCode: boolean;
  talksToHuman: boolean;
  typicalLifetimeMin: { min: number; max: number };
}

export const ROLE_DEFINITIONS: Record<AgentRole, RoleDefinition> = {
  orchestrator: {
    role: "orchestrator",
    description: "Manages pipeline, surfaces decisions, translates goals to specs",
    allowedTools: ["df"],
    codebaseAccess: "none",
    scenarioAccess: false,
    writesCode: false,
    talksToHuman: true,
    typicalLifetimeMin: { min: 30, max: 120 },
  },
  architect: {
    role: "architect",
    description: "Technical decomposition, produces buildplans and contracts",
    allowedTools: ["df", "read", "glob", "grep"],
    codebaseAccess: "read-only",
    scenarioAccess: false,
    writesCode: false,
    talksToHuman: false,
    typicalLifetimeMin: { min: 5, max: 10 },
  },
  builder: {
    role: "builder",
    description: "Implements modules in isolated worktrees following TDD",
    allowedTools: ["df", "read", "write", "edit", "bash", "glob", "grep"],
    codebaseAccess: "read-write",
    scenarioAccess: false,
    writesCode: true,
    talksToHuman: false,
    typicalLifetimeMin: { min: 10, max: 45 },
  },
  evaluator: {
    role: "evaluator",
    description: "Validates builds against holdout scenarios",
    allowedTools: ["df", "read", "bash", "glob", "grep"],
    codebaseAccess: "read-only",
    scenarioAccess: true,
    writesCode: false,
    talksToHuman: false,
    typicalLifetimeMin: { min: 5, max: 20 },
  },
  merger: {
    role: "merger",
    description: "Integrates into target branch with post-merge validation",
    allowedTools: ["df", "bash"],
    codebaseAccess: "read-write",
    scenarioAccess: false,
    writesCode: false,
    talksToHuman: false,
    typicalLifetimeMin: { min: 1, max: 5 },
  },
  "integration-tester": {
    role: "integration-tester",
    description: "Composes parallel builder outputs and validates composition",
    allowedTools: ["df", "read", "bash", "glob", "grep"],
    codebaseAccess: "read-only",
    scenarioAccess: false,
    writesCode: false,
    talksToHuman: false,
    typicalLifetimeMin: { min: 5, max: 15 },
  },
};
