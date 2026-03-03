import { describe, test, expect } from "bun:test";
import { generateSpecFromIssue } from "../../../src/importers/spec-generator.js";
import type { IssueData, Comment } from "../../../src/importers/types.js";

function makeIssue(overrides: Partial<IssueData> = {}): IssueData {
  return {
    title: "Fix authentication redirect loop",
    body: "The login page redirects to itself after OAuth callback.",
    labels: [],
    comments: [],
    sourceUrl: "https://github.com/org/repo/issues/123",
    ...overrides,
  };
}

describe("generateSpecFromIssue", () => {
  describe("frontmatter", () => {
    test("includes spec id in frontmatter", () => {
      const result = generateSpecFromIssue(makeIssue(), "spec_TEST123");
      expect(result).toMatch(/^---\n/);
      expect(result).toContain("id: spec_TEST123");
    });

    test("includes title in frontmatter", () => {
      const result = generateSpecFromIssue(makeIssue(), "spec_001");
      expect(result).toContain("title: Fix authentication redirect loop");
    });

    test("status is always draft", () => {
      const result = generateSpecFromIssue(makeIssue(), "spec_001");
      expect(result).toContain("status: draft");
    });

    test("includes source_url in frontmatter", () => {
      const result = generateSpecFromIssue(makeIssue(), "spec_001");
      expect(result).toContain("source_url: https://github.com/org/repo/issues/123");
    });

    test("maps labels to type and priority", () => {
      const issue = makeIssue({ labels: ["bug", "p0"] });
      const result = generateSpecFromIssue(issue, "spec_001");
      expect(result).toContain("type: bug");
      expect(result).toContain("priority: critical");
    });

    test("defaults type and priority when no matching labels", () => {
      const result = generateSpecFromIssue(makeIssue(), "spec_001");
      expect(result).toContain("type: feature");
      expect(result).toContain("priority: medium");
    });
  });

  describe("body with structured sections", () => {
    test("extracts first paragraph as Goal when body has ## Description", () => {
      const issue = makeIssue({
        body: "## Description\n\nThe auth flow is broken.\n\n## Requirements\n\n- Fix redirect",
      });
      const result = generateSpecFromIssue(issue, "spec_001");
      expect(result).toContain("## Goal");
      expect(result).toContain("The auth flow is broken.");
    });

    test("extracts checkbox items as requirements", () => {
      const issue = makeIssue({
        body: "## Description\n\nGoal text.\n\n- [ ] Support OAuth2\n- [ ] Handle token refresh\n- [x] Validate redirect URI",
      });
      const result = generateSpecFromIssue(issue, "spec_001");
      expect(result).toContain("## Requirements");
      expect(result).toContain("- Support OAuth2");
      expect(result).toContain("- Handle token refresh");
      expect(result).toContain("- Validate redirect URI");
    });

    test("extracts numbered list items as requirements", () => {
      const issue = makeIssue({
        body: "## Description\n\nGoal text.\n\n1. First requirement\n2. Second requirement\n3. Third requirement",
      });
      const result = generateSpecFromIssue(issue, "spec_001");
      expect(result).toContain("## Requirements");
      expect(result).toContain("- First requirement");
      expect(result).toContain("- Second requirement");
      expect(result).toContain("- Third requirement");
    });

    test("extracts ## Acceptance Criteria as scenarios", () => {
      const issue = makeIssue({
        body: "## Description\n\nGoal.\n\n## Acceptance Criteria\n\n- [ ] User can log in with GitHub\n- [ ] Token is stored securely\n- [ ] Refresh works automatically",
      });
      const result = generateSpecFromIssue(issue, "spec_001");
      expect(result).toContain("## Scenarios");
      expect(result).toContain("### Functional");
      expect(result).toContain("User can log in with GitHub");
      expect(result).toContain("Token is stored securely");
      expect(result).toContain("Refresh works automatically");
    });

    test("extracts ## Test Cases as scenarios", () => {
      const issue = makeIssue({
        body: "## Description\n\nGoal.\n\n## Test Cases\n\n- [ ] Login succeeds with valid creds\n- [ ] Login fails with invalid creds",
      });
      const result = generateSpecFromIssue(issue, "spec_001");
      expect(result).toContain("### Functional");
      expect(result).toContain("Login succeeds with valid creds");
      expect(result).toContain("Login fails with invalid creds");
    });
  });

  describe("unstructured body", () => {
    test("uses entire body as Goal when no structured sections", () => {
      const issue = makeIssue({
        body: "The login page just keeps redirecting. It started happening after the last deploy. Please fix ASAP.",
      });
      const result = generateSpecFromIssue(issue, "spec_001");
      expect(result).toContain("## Goal");
      expect(result).toContain("The login page just keeps redirecting.");
    });

    test("adds placeholder requirements when none extracted", () => {
      const issue = makeIssue({ body: "Just a plain description." });
      const result = generateSpecFromIssue(issue, "spec_001");
      expect(result).toContain("## Requirements");
      expect(result).toContain("TODO:");
    });

    test("adds placeholder scenarios when none extracted", () => {
      const issue = makeIssue({ body: "Just a plain description." });
      const result = generateSpecFromIssue(issue, "spec_001");
      expect(result).toContain("## Scenarios");
      expect(result).toContain("### Functional");
    });
  });

  describe("heading", () => {
    test("includes title as markdown heading", () => {
      const result = generateSpecFromIssue(makeIssue(), "spec_001");
      expect(result).toContain("# Fix authentication redirect loop");
    });
  });

  describe("comment extraction", () => {
    test("no comment section when there are no comments", () => {
      const result = generateSpecFromIssue(makeIssue(), "spec_001");
      expect(result).not.toContain("## Context from Discussion");
    });

    test("adds comment section when there are non-bot comments", () => {
      const comments: Comment[] = [
        {
          author: "janedoe",
          date: "2024-01-15T10:30:00Z",
          body: "I can reproduce this on Chrome 120.",
          isBot: false,
        },
      ];
      const issue = makeIssue({ comments });
      const result = generateSpecFromIssue(issue, "spec_001");
      expect(result).toContain("## Context from Discussion");
      expect(result).toContain("**janedoe**");
      expect(result).toContain("2024-01-15");
      expect(result).toContain("I can reproduce this on Chrome 120.");
    });

    test("skips bot comments", () => {
      const comments: Comment[] = [
        { author: "dependabot[bot]", date: "2024-01-15T10:30:00Z", body: "Auto update.", isBot: true },
        { author: "janedoe", date: "2024-01-15T11:00:00Z", body: "Real comment.", isBot: false },
      ];
      const issue = makeIssue({ comments });
      const result = generateSpecFromIssue(issue, "spec_001");
      expect(result).toContain("Real comment.");
      expect(result).not.toContain("dependabot");
      expect(result).not.toContain("Auto update.");
    });

    test("limits to 5 most recent comments", () => {
      const comments: Comment[] = Array.from({ length: 8 }, (_, i) => ({
        author: `user${i}`,
        date: `2024-01-${String(i + 10).padStart(2, "0")}T10:00:00Z`,
        body: `Comment ${i}`,
        isBot: false,
      }));
      const issue = makeIssue({ comments });
      const result = generateSpecFromIssue(issue, "spec_001");
      // Should contain last 5 (indices 3-7)
      expect(result).toContain("Comment 3");
      expect(result).toContain("Comment 7");
      expect(result).not.toContain("Comment 0");
      expect(result).not.toContain("Comment 2");
    });

    test("truncates long comment bodies to 500 chars", () => {
      const longBody = "x".repeat(600);
      const comments: Comment[] = [
        { author: "user", date: "2024-01-15T10:00:00Z", body: longBody, isBot: false },
      ];
      const issue = makeIssue({ comments });
      const result = generateSpecFromIssue(issue, "spec_001");
      // The comment body in the output should be truncated
      expect(result).not.toContain("x".repeat(600));
      expect(result).toContain("x".repeat(500));
      expect(result).toContain("...");
    });

    test("no comment section when only bot comments exist", () => {
      const comments: Comment[] = [
        { author: "bot[bot]", date: "2024-01-15T10:00:00Z", body: "Automated.", isBot: true },
      ];
      const issue = makeIssue({ comments });
      const result = generateSpecFromIssue(issue, "spec_001");
      expect(result).not.toContain("## Context from Discussion");
    });
  });
});
