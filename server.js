const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const app = express();
const PORT = 7842;

const AGENTS = {
  alfred: { name: 'Alfred', workspace: '/home/andreas/.openclaw/workspace' },
  dorothy: { name: 'Dorothy', workspace: '/home/andreas/.openclaw/workspace-dorothy' },
  q: { name: 'Q', workspace: '/home/andreas/.openclaw/workspace-q' },
  ian: { name: 'Dr. Ian', workspace: '/home/andreas/.openclaw/workspace-ian' },
  sean: { name: 'Sean', workspace: '/home/andreas/.openclaw/workspace-sean' },
};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/agents', (req, res) => {
  const agents = Object.entries(AGENTS).map(([id, info]) => ({
    id,
    name: info.name,
    exists: fs.existsSync(info.workspace),
  }));
  res.json(agents);
});

function buildFileTree(dir, baseDir) {
  const entries = [];
  let items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return entries;
  }

  items.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const item of items) {
    if (item.isFile() && item.name.startsWith('.')) continue;
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (item.isDirectory()) {
      entries.push({
        type: 'dir',
        name: item.name,
        path: relativePath,
        children: buildFileTree(fullPath, baseDir),
      });
    } else if (item.name.endsWith('.md') || item.name.endsWith('.markdown')) {
      entries.push({
        type: 'file',
        name: item.name,
        path: relativePath,
      });
    }
  }
  return entries;
}

app.get('/api/files', (req, res) => {
  const agentId = req.query.agent;
  const agent = AGENTS[agentId];
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (!fs.existsSync(agent.workspace)) {
    return res.json([]);
  }
  const tree = buildFileTree(agent.workspace, agent.workspace);
  res.json(tree);
});

app.get('/api/file', (req, res) => {
  const agentId = req.query.agent;
  const filePath = req.query.path;
  const agent = AGENTS[agentId];
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (!filePath) return res.status(400).json({ error: 'path is required' });

  // Prevent path traversal
  const resolved = path.resolve(agent.workspace, filePath);
  if (!resolved.startsWith(path.resolve(agent.workspace) + path.sep)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  let content;
  try {
    content = fs.readFileSync(resolved, 'utf8');
  } catch {
    return res.status(404).json({ error: 'File not found' });
  }

  const html = marked(content);
  res.json({ html, raw: content, path: filePath });
});

app.listen(PORT, () => {
  console.log(`Agent Notes Viewer running at http://localhost:${PORT}`);
});
