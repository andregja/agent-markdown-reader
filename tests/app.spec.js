const { test, expect } = require("@playwright/test");

// ── UI tests ──────────────────────────────────────────────────────────────────

test("page loads and shows 5 agents in sidebar", async ({ page }) => {
  await page.goto("/");
  const buttons = page.locator(".agent-btn");
  await expect(buttons).toHaveCount(5);
});

test("clicking Alfred shows his file tree", async ({ page }) => {
  await page.goto("/");
  // Wait for sidebar to populate
  await page.locator(".agent-btn", { hasText: "Alfred" }).click();
  // At least one file entry should appear
  const files = page.locator(".tree-file");
  await expect(files.first()).toBeVisible({ timeout: 10000 });
});

test("clicking a markdown file renders non-empty content", async ({ page }) => {
  await page.goto("/");
  await page.locator(".agent-btn", { hasText: "Alfred" }).click();
  // Wait for file tree to load, then click the first file
  const firstFile = page.locator(".tree-file").first();
  await expect(firstFile).toBeVisible({ timeout: 10000 });
  await firstFile.click();
  // The markdown output should be visible and non-empty
  const output = page.locator("#markdown-output");
  await expect(output).toBeVisible({ timeout: 10000 });
  await expect(output).not.toBeEmpty();
});

test("filter input narrows down visible files", async ({ page }) => {
  await page.goto("/");
  await page.locator(".agent-btn", { hasText: "Alfred" }).click();
  // Wait for files to load
  await expect(page.locator(".tree-file").first()).toBeVisible({ timeout: 10000 });

  const totalBefore = await page.locator(".tree-file").count();

  // Type a very specific filter that should match only one or a few files
  await page.fill("#file-search", "MEMORY");

  // After filtering, should have fewer (or equal) files visible
  const totalAfter = await page.locator(".tree-file").count();
  expect(totalAfter).toBeLessThan(totalBefore);
});

// ── API tests ─────────────────────────────────────────────────────────────────

test("GET /api/agents returns JSON with all 5 agents", async ({ request }) => {
  const res = await request.get("/api/agents");
  expect(res.ok()).toBeTruthy();
  const agents = await res.json();
  expect(Array.isArray(agents)).toBeTruthy();
  expect(agents).toHaveLength(5);
  const ids = agents.map((a) => a.id);
  expect(ids).toContain("alfred");
  expect(ids).toContain("dorothy");
  expect(ids).toContain("q");
  expect(ids).toContain("ian");
  expect(ids).toContain("sean");
});

test("GET /api/files?agent=alfred returns a file list", async ({ request }) => {
  const res = await request.get("/api/files?agent=alfred");
  expect(res.ok()).toBeTruthy();
  const tree = await res.json();
  expect(Array.isArray(tree)).toBeTruthy();
  expect(tree.length).toBeGreaterThan(0);
  // Every top-level entry should have type and name
  for (const entry of tree) {
    expect(entry).toHaveProperty("type");
    expect(entry).toHaveProperty("name");
    expect(["file", "dir"]).toContain(entry.type);
  }
});

test("GET /api/file?agent=alfred&path=MEMORY.md returns markdown content", async ({ request }) => {
  const res = await request.get("/api/file?agent=alfred&path=MEMORY.md");
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data).toHaveProperty("html");
  expect(data).toHaveProperty("raw");
  expect(typeof data.html).toBe("string");
  expect(data.html.length).toBeGreaterThan(0);
  expect(typeof data.raw).toBe("string");
  expect(data.raw.length).toBeGreaterThan(0);
});
