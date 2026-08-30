import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function getTsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next") {
        files.push(...getTsFiles(fullPath));
      }
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

test("Architecture: domain layer must be pure TypeScript (no Zod, React, Supabase, Zustand)", () => {
  const domainDir = path.join(rootDir, "domain");
  if (!fs.existsSync(domainDir)) return;

  const files = getTsFiles(domainDir);
  const forbiddenPatterns = [
    /from\s+["']zod["']/,
    /from\s+["']react["']/,
    /from\s+["']zustand["']/,
    /from\s+["']@supabase/,
    /from\s+["'].*infrastructure/,
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of forbiddenPatterns) {
      assert.ok(
        !pattern.test(content),
        `Domain boundary violation in ${path.relative(rootDir, file)}: forbidden import matching ${pattern}`,
      );
    }
  }
});

test("Architecture: application layer must not import infrastructure, React, Zustand, or Supabase", () => {
  const appDir = path.join(rootDir, "application");
  if (!fs.existsSync(appDir)) return;

  const files = getTsFiles(appDir);
  const forbiddenPatterns = [
    /from\s+["'].*infrastructure/,
    /from\s+["']react["']/,
    /from\s+["']zustand["']/,
    /from\s+["']@supabase/,
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of forbiddenPatterns) {
      assert.ok(
        !pattern.test(content),
        `Application boundary violation in ${path.relative(rootDir, file)}: forbidden import matching ${pattern}`,
      );
    }
  }
});

test("Architecture: Zustand stores must not directly import concrete infrastructure adapters", () => {
  const storesDir = path.join(rootDir, "stores");
  if (!fs.existsSync(storesDir)) return;

  const files = getTsFiles(storesDir);
  const forbiddenPatterns = [
    /from\s+["'].*api-owner-repository\.adapter/,
    /from\s+["'].*supabase-session\.adapter/,
    /from\s+["']@supabase/,
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of forbiddenPatterns) {
      assert.ok(
        !pattern.test(content),
        `Store boundary violation in ${path.relative(rootDir, file)}: stores must call use cases via container, not concrete adapters directly`,
      );
    }
  }
});

test("Architecture: components must not import @supabase/supabase-js directly", () => {
  const componentsDir = path.join(rootDir, "components");
  if (!fs.existsSync(componentsDir)) return;

  const files = getTsFiles(componentsDir);
  const forbiddenPattern = /import\s+.*from\s+["']@supabase\/supabase-js["']/;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    assert.ok(
      !forbiddenPattern.test(content),
      `Presentation violation in ${path.relative(rootDir, file)}: components must not directly import @supabase/supabase-js`,
    );
  }
});

test("Architecture: Composition Root is the single accepted location for adapter-to-port wiring", () => {
  const containerFile = path.join(
    rootDir,
    "infrastructure",
    "composition",
    "owner-web-container.ts",
  );
  assert.ok(
    fs.existsSync(containerFile),
    "Composition root owner-web-container.ts must exist",
  );
});

test("Frontend Governance: Zero useState usage in Owner Web (Zustand strictly required)", () => {
  const allFiles = getTsFiles(rootDir);
  const useStateRegex = /\buseState\s*\(/;

  for (const file of allFiles) {
    const content = fs.readFileSync(file, "utf8");
    // Strip comments to check actual code execution
    const codeOnly = content
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*/g, "");

    assert.ok(
      !useStateRegex.test(codeOnly),
      `useState forbidden in Owner Web MVP: found in ${path.relative(rootDir, file)}. Use Zustand store instead.`,
    );
  }
});
