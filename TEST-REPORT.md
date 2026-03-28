# Test Report: agent-notes-viewer

**Date:** 2026-03-28
**Runner:** Playwright 1.58.2
**Server:** http://localhost:7842 (pre-running, not started by tests)

## Results

| # | Test | Result |
|---|------|--------|
| 1 | Page loads and shows 5 agents in sidebar | ✅ PASS |
| 2 | Clicking Alfred shows his file tree (files appear) | ✅ PASS |
| 3 | Clicking a markdown file renders non-empty content | ✅ PASS |
| 4 | Filter input narrows down visible files | ✅ PASS |
| 5 | `GET /api/agents` returns JSON with all 5 agents | ✅ PASS |
| 6 | `GET /api/files?agent=alfred` returns a file list | ✅ PASS |
| 7 | `GET /api/file?agent=alfred&path=MEMORY.md` returns markdown content | ✅ PASS |

**7 / 7 passed — 0 failures.** Total run time: 3.1 s.

## Security fixes applied (2026-03-28)

All three security issues from REVIEW.md have been fixed. Tests re-run and still passing.

1. **Path traversal fix** (`server.js`) — changed `startsWith(path.resolve(agent.workspace))`
   to `startsWith(path.resolve(agent.workspace) + path.sep)` to prevent sibling-directory
   bypass (e.g. `workspace` prefix matching `workspace-dorothy`).

2. **Missing `path` param guard** (`server.js`) — added early return with HTTP 400 when
   the `path` query parameter is absent, preventing an unhandled `TypeError`.

3. **XSS fix** (`public/index.html`) — added DOMPurify via CDN and wrapped the `innerHTML`
   assignment: `markdownOutput.innerHTML = DOMPurify.sanitize(data.html)`.

4. **Hidden directories now visible** (`server.js`) — changed dotfile filter from
   `item.name.startsWith('.')` to `item.isFile() && item.name.startsWith('.')` so that
   dot-directories like `.claude/` (containing MEMORY.md etc.) appear in the file tree.

5. **Error handling** (`public/index.html`) — added try/catch in `init()` and
   `selectAgent()` with user-visible error messages in the sidebar/file list.
