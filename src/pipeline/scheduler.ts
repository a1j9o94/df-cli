import type { DependencyEdge, ModuleDefinition } from "../types/index.js";

export interface ScheduleResult {
  groups: string[][];
  criticalPath: string[];
  estimatedDurationMin: number;
}

/**
 * Topological sort using Kahn's algorithm.
 * Groups modules into parallel phases respecting dependency ordering and max_parallel.
 */
export function buildSchedule(
  modules: ModuleDefinition[],
  dependencies: DependencyEdge[],
  maxParallel: number,
): ScheduleResult {
  const cycles = detectCycles(dependencies);
  if (cycles.length > 0) {
    throw new Error(`Dependency cycle detected: ${cycles[0].join(" -> ")}`);
  }

  const moduleIds = new Set(modules.map((m) => m.id));
  const moduleMap = new Map(modules.map((m) => [m.id, m]));

  // Build adjacency list and in-degree map
  // "from" depends on "to" — so "to" must complete before "from"
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>(); // to -> [from, from, ...]

  for (const id of moduleIds) {
    inDegree.set(id, 0);
    dependents.set(id, []);
  }

  for (const dep of dependencies) {
    if (!moduleIds.has(dep.from) || !moduleIds.has(dep.to)) continue;
    inDegree.set(dep.from, (inDegree.get(dep.from) ?? 0) + 1);
    dependents.get(dep.to)!.push(dep.from);
  }

  // Kahn's algorithm — collect into phases
  const groups: string[][] = [];
  let queue = [...moduleIds].filter((id) => inDegree.get(id) === 0);

  while (queue.length > 0) {
    // Respect max_parallel: split large groups
    for (let i = 0; i < queue.length; i += maxParallel) {
      groups.push(queue.slice(i, i + maxParallel));
    }

    const nextQueue: string[] = [];
    for (const id of queue) {
      for (const dependent of dependents.get(id) ?? []) {
        const newDeg = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDeg);
        if (newDeg === 0) {
          nextQueue.push(dependent);
        }
      }
    }
    queue = nextQueue;
  }

  // Compute critical path (longest path through the DAG by estimated duration)
  const criticalPath = computeCriticalPath(modules, dependencies);

  // Estimated duration = sum of max durations per phase group
  let estimatedDurationMin = 0;
  for (const group of groups) {
    const maxDuration = Math.max(
      ...group.map((id) => moduleMap.get(id)?.estimated_duration_min ?? 0),
    );
    estimatedDurationMin += maxDuration;
  }

  return { groups, criticalPath, estimatedDurationMin };
}

/**
 * Returns module IDs that have all dependencies satisfied (in completedModules set).
 */
export function getReadyModules(
  modules: ModuleDefinition[],
  dependencies: DependencyEdge[],
  completedModules: Set<string>,
): string[] {
  const moduleIds = new Set(modules.map((m) => m.id));
  const ready: string[] = [];

  for (const mod of modules) {
    if (completedModules.has(mod.id)) continue;

    // Check if all dependencies are satisfied
    const deps = dependencies.filter((d) => d.from === mod.id && moduleIds.has(d.to));
    const allSatisfied = deps.every((d) => completedModules.has(d.to));

    if (allSatisfied) {
      ready.push(mod.id);
    }
  }

  return ready;
}

/**
 * Detects cycles using Tarjan's algorithm (iterative DFS with coloring).
 * Returns an array of cycles (each cycle is an array of module IDs).
 */
export function detectCycles(dependencies: DependencyEdge[]): string[][] {
  // Build adjacency: from depends on to, so edge goes to -> from for topo sort
  // But for cycle detection, we care about the dependency direction: from -> to
  const nodes = new Set<string>();
  const adj = new Map<string, string[]>();

  for (const dep of dependencies) {
    nodes.add(dep.from);
    nodes.add(dep.to);
    if (!adj.has(dep.from)) adj.set(dep.from, []);
    adj.get(dep.from)!.push(dep.to);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const cycles: string[][] = [];

  for (const node of nodes) {
    color.set(node, WHITE);
  }

  for (const start of nodes) {
    if (color.get(start) !== WHITE) continue;

    const stack: string[] = [start];
    parent.set(start, null);

    while (stack.length > 0) {
      const node = stack[stack.length - 1];

      if (color.get(node) === WHITE) {
        color.set(node, GRAY);
        for (const neighbor of adj.get(node) ?? []) {
          if (color.get(neighbor) === GRAY) {
            // Back edge — cycle found. Trace it.
            const cycle: string[] = [neighbor];
            let cur = node;
            while (cur !== neighbor) {
              cycle.push(cur);
              cur = parent.get(cur)!;
            }
            cycle.push(neighbor);
            cycle.reverse();
            cycles.push(cycle);
          } else if (color.get(neighbor) === WHITE) {
            parent.set(neighbor, node);
            stack.push(neighbor);
          }
        }
      } else {
        stack.pop();
        color.set(node, BLACK);
      }
    }
  }

  return cycles;
}

/**
 * Compute critical path: longest path through the DAG by estimated duration.
 */
function computeCriticalPath(
  modules: ModuleDefinition[],
  dependencies: DependencyEdge[],
): string[] {
  const moduleMap = new Map(modules.map((m) => [m.id, m]));
  const moduleIds = new Set(modules.map((m) => m.id));

  // dp[node] = longest path ending at node
  const dp = new Map<string, number>();
  const pred = new Map<string, string | null>();

  // Topological order (Kahn's)
  const inDeg = new Map<string, number>();
  const adj = new Map<string, string[]>(); // to -> [from...] (dependency satisfied enables from)

  for (const id of moduleIds) {
    inDeg.set(id, 0);
    adj.set(id, []);
    dp.set(id, moduleMap.get(id)?.estimated_duration_min ?? 0);
    pred.set(id, null);
  }

  for (const dep of dependencies) {
    if (!moduleIds.has(dep.from) || !moduleIds.has(dep.to)) continue;
    inDeg.set(dep.from, (inDeg.get(dep.from) ?? 0) + 1);
    adj.get(dep.to)!.push(dep.from);
  }

  const queue = [...moduleIds].filter((id) => inDeg.get(id) === 0);

  while (queue.length > 0) {
    const node = queue.shift()!;
    const nodeDur = dp.get(node) ?? 0;

    for (const next of adj.get(node) ?? []) {
      const nextOwnDur = moduleMap.get(next)?.estimated_duration_min ?? 0;
      const candidate = nodeDur + nextOwnDur;
      if (candidate > (dp.get(next) ?? 0)) {
        dp.set(next, candidate);
        pred.set(next, node);
      }
      const newDeg = (inDeg.get(next) ?? 1) - 1;
      inDeg.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  // Find the node with the longest path
  let maxNode = "";
  let maxDur = 0;
  for (const [id, dur] of dp) {
    if (dur > maxDur) {
      maxDur = dur;
      maxNode = id;
    }
  }

  if (!maxNode) return [];

  // Trace back
  const path: string[] = [];
  let cur: string | null = maxNode;
  while (cur) {
    path.push(cur);
    cur = pred.get(cur) ?? null;
  }
  path.reverse();
  return path;
}
