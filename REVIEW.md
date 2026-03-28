# Code Review: agent-notes-viewer

## Security Issues

### 1. Path Traversal — Directory Prefix Bypass (server.js:85–86) **HIGH**

```js
const resolved = path.resolve(agent.workspace, filePath);
if (!resolved.startsWith(path.resolve(agent.workspace))) { ... }
```

`String.startsWith` with a bare directory path is unsafe when sibling directories share a name prefix. Given:

- alfred's workspace: `/home/andreas/.openclaw/workspace`
- dorothy's workspace: `/home/andreas/.openclaw/workspace-dorothy`

A request `?agent=alfred&path=../workspace-dorothy/secret.md` resolves to
`/home/andreas/.openclaw/workspace-dorothy/secret.md`, which **does** pass the
`startsWith('/home/andreas/.openclaw/workspace')` check because `workspace-dorothy`
starts with `workspace`. This lets a caller read files from another agent's workspace.

**Fix:** append a trailing separator to the guard:
```js
if (!resolved.startsWith(path.resolve(agent.workspace) + path.sep)) { ... }
```

---

### 2. Missing `path` Parameter Validation (server.js:77–98) **MEDIUM**

If the `path` query parameter is absent (`/api/file?agent=alfred`), `filePath` is
`undefined`. `path.resolve(agent.workspace, undefined)` throws a `TypeError`, which
Express will turn into an unhandled-error 500 response, potentially exposing a stack
trace.

**Fix:** add an early guard:
```js
if (!filePath) return res.status(400).json({ error: 'path is required' });
```

---

### 3. Stored XSS via Unsanitized Markdown HTML (server.js:96 / index.html:471) **MEDIUM**

`marked(content)` renders raw HTML embedded in markdown files verbatim (e.g.
`<script>alert(1)</script>`). The client inserts this with `innerHTML = data.html`
(index.html:471). Any script embedded in a workspace markdown file executes in the
browser.

Since the workspaces are local and agent-controlled this may be tolerable, but it is
worth noting. **Fix:** pass `{ mangle: false, headerIds: false }` and consider using
`marked-sanitize-html` or DOMPurify on the client side.

---

## Correctness / Robustness

### 4. No Error Handling in `init()` (index.html:363–378)

If `/api/agents` returns a non-OK response or the network is down, `res.json()` throws
and the sidebar remains empty with no user feedback.

**Fix:** wrap in try/catch and show an error message in the sidebar.

---

### 5. No Error Handling in `selectAgent()` (index.html:380–392)

Same pattern — if `/api/files` fails the spinner never disappears.

---

### 6. `buildFileTree` Skips Hidden Directories (server.js:44)

```js
if (item.name.startsWith('.')) continue;
```

This skips `.claude/`, which is where Claude Code stores its project memory
(`MEMORY.md`, etc.). These are exactly the notes this viewer is meant to show.

**Intentional or not?** Worth documenting. If `.claude/` should be visible, remove
or narrow the filter.

---

## Minor Notes

- `marked` v9 defaults have `async: false` but no explicit renderer options set; the
  rendered HTML is trusted verbatim (see #3 above).
- No rate limiting or authentication — acceptable for a localhost-only tool.
- `buildFileTree` recurses unbounded; a deeply nested workspace could hit the call
  stack limit (unlikely in practice).
