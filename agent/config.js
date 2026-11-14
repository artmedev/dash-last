import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AGENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CONFIG = path.join(AGENT_DIR, '.agent.json');

export function loadConfig(argv = []) {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch { /* no config file yet */ }
  let changed = false;
  for (let i = 0; i < argv.length; i++) {
    const m = argv[i].match(/^--(server|token)$/);
    if (m && argv[i + 1]) { cfg[m[1]] = argv[++i]; changed = true; }
  }
  if (changed) fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2));
  if (!cfg.server || !cfg.token) {
    console.error('Set server and token: npm run agent -- --server http://localhost:5173 --token <token from the Agent page>');
    process.exit(1);
  }
  cfg.server = cfg.server.replace(/\/+$/, '');
  return cfg;
}

export async function call(cfg, pathname, body) {
  const res = await fetch(`${cfg.server}/api/agent${pathname}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${data.error || ''}`.trim());
  return data;
}
