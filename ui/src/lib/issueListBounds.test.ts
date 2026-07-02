import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ISSUE_LIST_CALL = /issuesApi\.list\(/;
const LIMIT_FILTER = /\blimit\s*:/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) return sourceFiles(path);
      if (!/\.(ts|tsx)$/.test(entry)) return [];
      if (/\.test\.(ts|tsx)$/.test(entry)) return [];
      return [path];
    });
}

function captureCall(lines: string[], start: number) {
  const snippet: string[] = [];
  let depth = 0;
  let started = false;

  for (let index = start; index < Math.min(lines.length, start + 20); index += 1) {
    const line = lines[index];
    snippet.push(line);
    for (const char of line) {
      if (char === "(") {
        depth += 1;
        started = true;
      } else if (char === ")") {
        depth -= 1;
      }
    }
    if (started && depth <= 0) break;
  }

  return snippet.join("\n");
}

describe("issue list fetch bounds", () => {
  it("keeps every issuesApi.list call explicitly capped", () => {
    const uncappedCalls = sourceFiles(SOURCE_ROOT).flatMap((file) => {
      const lines = readFileSync(file, "utf8").split("\n");
      return lines.flatMap((line, index) => {
        if (!ISSUE_LIST_CALL.test(line)) return [];
        const snippet = captureCall(lines, index);
        if (LIMIT_FILTER.test(snippet)) return [];
        return [`${relative(SOURCE_ROOT, file)}:${index + 1}`];
      });
    });

    expect(uncappedCalls).toEqual([]);
  });
});
