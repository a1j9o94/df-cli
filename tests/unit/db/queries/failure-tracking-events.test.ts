import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import { createRun } from "../../../../src/db/queries/runs.js";
import { createEvent, listEvents } from "../../../../src/db/queries/events.js";
import type { SqliteDb } from "../../../../src/db/index.js";
import type { EventType } from "../../../../src/types/event.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_1" }).id;
});

describe("module-redecomposed event", () => {
  test("can create a module-redecomposed event", () => {
    const event = createEvent(db, runId, "module-redecomposed", {
      moduleId: "mod-parser",
      attemptCount: 2,
      threshold: 2,
    });

    expect(event.type).toBe("module-redecomposed");
    expect(event.run_id).toBe(runId);
    const data = JSON.parse(event.data!);
    expect(data.moduleId).toBe("mod-parser");
    expect(data.attemptCount).toBe(2);
    expect(data.threshold).toBe(2);
  });

  test("module-redecomposed event is listed correctly", () => {
    createEvent(db, runId, "module-redecomposed", {
      moduleId: "mod-parser",
      oldModuleId: "mod-parser",
      newModuleIds: ["mod-parser-a", "mod-parser-b"],
    });

    const events = listEvents(db, runId, { type: "module-redecomposed" });
    expect(events).toHaveLength(1);
    const data = JSON.parse(events[0].data!);
    expect(data.newModuleIds).toEqual(["mod-parser-a", "mod-parser-b"]);
  });

  test("module-redecomposed is a valid EventType", () => {
    // This test verifies the type compiles correctly
    const eventType: EventType = "module-redecomposed";
    expect(eventType).toBe("module-redecomposed");
  });
});
