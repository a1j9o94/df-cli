import { describe, test, expect } from "bun:test";
import type { EventType } from "../../../src/types/event.js";

describe("EventType includes 'agent-branch-promoted'", () => {
  test("'agent-branch-promoted' is a valid EventType value", () => {
    const eventType: EventType = "agent-branch-promoted";
    expect(eventType).toBe("agent-branch-promoted");
  });

  test("'agent-incomplete' is a valid EventType value", () => {
    const eventType: EventType = "agent-incomplete";
    expect(eventType).toBe("agent-incomplete");
  });

  test("all new event types compile alongside existing ones", () => {
    const events: EventType[] = [
      "agent-spawned",
      "agent-completed",
      "agent-failed",
      "agent-killed",
      "agent-branch-promoted",
      "agent-incomplete",
    ];
    expect(events).toContain("agent-branch-promoted");
    expect(events).toContain("agent-incomplete");
  });
});
