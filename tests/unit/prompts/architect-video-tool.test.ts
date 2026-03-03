import { describe, test, expect } from "bun:test";
import { getArchitectPrompt } from "../../../src/agents/prompts/architect.js";

const baseArchitectContext = {
  specId: "spec_test123",
  runId: "run_test456",
  agentId: "agt_test789",
};

// =============================================================================
// Architect Prompt: Video research tool (dark research video) integration
// =============================================================================

describe("Architect prompt — video research tool references", () => {
  test("mentions 'dark research video' as an available command", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toContain("dark research video");
  });

  test("includes dark research video with agent ID in command example", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    // Should show the command with the agent's specific ID
    expect(prompt).toContain("dark research video agt_test789");
  });

  test("mentions --question flag for asking about video content", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toContain("--question");
  });

  test("mentions YouTube and Loom as supported video sources", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    const promptLower = prompt.toLowerCase();
    expect(promptLower).toContain("youtube");
    expect(promptLower).toContain("loom");
  });

  test("video research command appears in Communication section", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    const commIndex = prompt.indexOf("## Communication");
    const videoIndex = prompt.indexOf("dark research video");
    expect(commIndex).toBeGreaterThan(-1);
    expect(videoIndex).toBeGreaterThan(-1);
    // Video research command should be in or after Communication section
    expect(videoIndex).toBeGreaterThan(commIndex);
  });

  test("preserves all existing architect prompt sections", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toContain("## Identity");
    expect(prompt).toContain("## Inputs");
    expect(prompt).toContain("## Workflow");
    expect(prompt).toContain("## Creating Holdout Scenarios");
    expect(prompt).toContain("## Buildplan Output");
    expect(prompt).toContain("## Decomposition Principles");
    expect(prompt).toContain("## Communication");
  });

  test("video tool section mentions extracting transcripts", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt.toLowerCase()).toContain("transcript");
  });

  test("video tool section mentions saving as research artifact", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    // Should indicate that results get saved as research artifacts
    expect(prompt.toLowerCase()).toMatch(/research.*artifact|save.*research/);
  });
});

// =============================================================================
// Architect Prompt: Video URL call-out when specContent has video URLs
// =============================================================================

describe("Architect prompt — video URL detection in spec content", () => {
  test("when specContent has YouTube URL, prompt calls it out", () => {
    const prompt = getArchitectPrompt({
      ...baseArchitectContext,
      specContent: "# Spec\n\nSee https://www.youtube.com/watch?v=abc123 for the tutorial approach.",
    });
    expect(prompt).toContain("https://www.youtube.com/watch?v=abc123");
    // Should have a section or note calling out the video URLs
    expect(prompt.toLowerCase()).toMatch(/video.*url|referenced.*video/);
  });

  test("when specContent has Loom URL, prompt calls it out", () => {
    const prompt = getArchitectPrompt({
      ...baseArchitectContext,
      specContent: "# Spec\n\nWatch the walkthrough: https://www.loom.com/share/def456",
    });
    expect(prompt).toContain("https://www.loom.com/share/def456");
  });

  test("when specContent has multiple video URLs, all are listed", () => {
    const prompt = getArchitectPrompt({
      ...baseArchitectContext,
      specContent: `
# Spec
See https://www.youtube.com/watch?v=vid1 and https://youtu.be/vid2
Also https://www.loom.com/share/loom1
      `,
    });
    expect(prompt).toContain("https://www.youtube.com/watch?v=vid1");
    expect(prompt).toContain("https://youtu.be/vid2");
    expect(prompt).toContain("https://www.loom.com/share/loom1");
  });

  test("when specContent has no video URLs, no video callout section appears", () => {
    const prompt = getArchitectPrompt({
      ...baseArchitectContext,
      specContent: "# Spec\n\nNo videos referenced here. Just text.",
    });
    // Should NOT have a video URLs section if there are none
    expect(prompt).not.toMatch(/## (Referenced |Detected )?Video/i);
  });

  test("when specContent is not provided, no video callout section appears", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    // No specContent means no video detection
    expect(prompt).not.toMatch(/## (Referenced |Detected )?Video/i);
  });

  test("video callout suggests using dark research video to extract context", () => {
    const prompt = getArchitectPrompt({
      ...baseArchitectContext,
      specContent: "# Spec\n\nSee https://youtu.be/abc123 for details.",
    });
    // Should suggest the architect use dark research video on these URLs
    expect(prompt).toContain("dark research video");
    expect(prompt).toContain("https://youtu.be/abc123");
  });
});
