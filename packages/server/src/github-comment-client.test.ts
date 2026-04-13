import { describe, expect, it } from "bun:test";
import {
  parseAgentNameFromHeader,
  mapCommentsToAgents,
} from "./github-comment-client.js";

describe("parseAgentNameFromHeader", () => {
  it("extracts agent name from a standard header", () => {
    const body =
      "## 📋 Requirements Analysis — Requirements Gatherer\n\nSome content here.";
    expect(parseAgentNameFromHeader(body)).toBe("Requirements Gatherer");
  });

  it("extracts agent name from architect header", () => {
    const body = "## 🏗️ Architecture Plan — Architect\n\nPlan details.";
    expect(parseAgentNameFromHeader(body)).toBe("Architect");
  });

  it("extracts agent name from domain expert header", () => {
    const body =
      "## 🗣️ Domain Language — Domain Expert\n\nDomain definitions.";
    expect(parseAgentNameFromHeader(body)).toBe("Domain Expert");
  });

  it("returns null when no header matches", () => {
    const body = "This is just a regular comment without a header.";
    expect(parseAgentNameFromHeader(body)).toBeNull();
  });

  it("returns null for empty body", () => {
    expect(parseAgentNameFromHeader("")).toBeNull();
  });

  it("handles header with extra whitespace", () => {
    const body =
      "##  🏗️  Architecture Plan  —  Architect  \n\nContent.";
    expect(parseAgentNameFromHeader(body)).toBe("Architect");
  });

  it("matches only the first header in multi-header bodies", () => {
    const body =
      "## 📋 Requirements — Requirements Gatherer\n\n## 🏗️ Architecture — Architect";
    expect(parseAgentNameFromHeader(body)).toBe("Requirements Gatherer");
  });

  it("handles header without emoji", () => {
    const body = "## Some Title — Test Master\n\nContent.";
    expect(parseAgentNameFromHeader(body)).toBe("Test Master");
  });
});

describe("mapCommentsToAgents", () => {
  it("maps comments to agents by header pattern", () => {
    const rawComments = [
      {
        body: "## 📋 Requirements Analysis — Requirements Gatherer\n\nContent.",
        html_url: "https://github.com/user/repo/issues/1#issuecomment-1",
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        body: "## 🏗️ Architecture Plan — Architect\n\nContent.",
        html_url: "https://github.com/user/repo/issues/1#issuecomment-2",
        created_at: "2025-01-02T00:00:00Z",
      },
    ];

    const result = mapCommentsToAgents(rawComments);

    expect(result).toHaveLength(2);
    expect(result[0]!.agentName).toBe("Requirements Gatherer");
    expect(result[0]!.url).toBe(
      "https://github.com/user/repo/issues/1#issuecomment-1",
    );
    expect(result[0]!.createdAt).toBe("2025-01-01T00:00:00Z");
    expect(result[1]!.agentName).toBe("Architect");
  });

  it("assigns 'unknown' to comments without matching headers", () => {
    const rawComments = [
      {
        body: "Just a regular comment.",
        html_url: "https://github.com/user/repo/issues/1#issuecomment-3",
        created_at: "2025-01-03T00:00:00Z",
      },
    ];

    const result = mapCommentsToAgents(rawComments);

    expect(result).toHaveLength(1);
    expect(result[0]!.agentName).toBe("unknown");
  });

  it("returns empty array for empty input", () => {
    expect(mapCommentsToAgents([])).toEqual([]);
  });

  it("handles multiple comments from the same agent", () => {
    const rawComments = [
      {
        body: "## 📋 Requirements — Requirements Gatherer\n\nFirst pass.",
        html_url: "https://github.com/user/repo/issues/1#issuecomment-1",
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        body: "## 📋 Requirements — Requirements Gatherer\n\nRevision.",
        html_url: "https://github.com/user/repo/issues/1#issuecomment-4",
        created_at: "2025-01-04T00:00:00Z",
      },
    ];

    const result = mapCommentsToAgents(rawComments);

    expect(result).toHaveLength(2);
    expect(result[0]!.agentName).toBe("Requirements Gatherer");
    expect(result[1]!.agentName).toBe("Requirements Gatherer");
  });

  it("preserves the full comment body", () => {
    const body =
      "## 🏗️ Architecture Plan — Architect\n\n### Details\n\n- Point 1\n- Point 2";
    const rawComments = [
      {
        body,
        html_url: "https://github.com/user/repo/issues/1#issuecomment-5",
        created_at: "2025-01-05T00:00:00Z",
      },
    ];

    const result = mapCommentsToAgents(rawComments);

    expect(result[0]!.body).toBe(body);
  });
});
