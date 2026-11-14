// Dash local agent.
// Polls the server, claims automation runs and opens a separate Claude Code window
// with Claude in Chrome for each one (the user's real Chrome with its cookies).
// The user types SMS codes and answers Claude's questions in that window.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { loadConfig, call, AGENT_DIR } from './config.js';

const cfg = loadConfig(process.argv.slice(2));
const RUNS_DIR = path.join(AGENT_DIR, 'runs');
const POLL_MS = 5000;
fs.mkdirSync(RUNS_DIR, { recursive: true });

const q = (s) => `"${String(s).replace(/"/g, '')}"`;

function launch(run, prompt) {
  const id = run.id;
  const reportCmd = `node ${q(path.join(AGENT_DIR, 'report.js'))} ${id}`;
  const promptFile = path.join(RUNS_DIR, `run-${id}.md`);
  fs.writeFileSync(promptFile, prompt.replaceAll('{{report_command}}', reportCmd), 'utf8');

  const addDirs = [run.params.documents_folder].filter(Boolean);
  for (const d of addDirs) {
    try { fs.mkdirSync(d, { recursive: true }); } catch { /* Claude will create it */ }
  }
  // ASCII-only initial message, so the console code page does not matter.
  const initial =
    `Read the file run-${id}.md in the current directory and follow its instructions exactly, step by step. ` +
    `Talk to the user in Russian.`;
  const claudeArgs = ['--chrome', ...addDirs.flatMap((d) => ['--add-dir', q(d)]), q(initial)].join(' ');

  if (process.platform === 'win32') {
    const launcher = path.join(RUNS_DIR, `run-${id}.cmd`);
    fs.writeFileSync(
      launcher,
      ['@echo off', 'chcp 65001 >nul', `title Dash: run ${id}`, `cd /d ${q(RUNS_DIR)}`, `claude ${claudeArgs}`, ''].join('\r\n'),
    );
    spawn('cmd.exe', ['/c', `start "Dash run ${id}" cmd /k ${q(launcher)}`], {
      detached: true, stdio: 'ignore', windowsVerbatimArguments: true,
    }).unref();
  } else if (process.platform === 'darwin') {
    const sh = path.join(RUNS_DIR, `run-${id}.sh`);
    fs.writeFileSync(sh, `#!/bin/sh\ncd ${q(RUNS_DIR)}\nclaude ${claudeArgs}\n`, { mode: 0o755 });
    spawn('open', ['-a', 'Terminal', sh], { detached: true, stdio: 'ignore' }).unref();
  } else {
    const sh = path.join(RUNS_DIR, `run-${id}.sh`);
    fs.writeFileSync(sh, `#!/bin/sh\ncd ${q(RUNS_DIR)}\nclaude ${claudeArgs}\nexec $SHELL\n`, { mode: 0o755 });
    spawn('x-terminal-emulator', ['-e', sh], { detached: true, stdio: 'ignore' }).unref();
  }
  console.log(`[${new Date().toLocaleTimeString()}] run #${id}: Claude window opened (${promptFile})`);
}

let online = null;
async function tick() {
  try {
    const { run, prompt } = await call(cfg, '/claim');
    if (online !== true) console.log(`Connected to ${cfg.server}. Waiting for runs...`);
    online = true;
    if (run) {
      await call(cfg, `/runs/${run.id}/status`, { status: 'running', message: 'Claude window opened on the computer' });
      try {
        launch(run, prompt);
      } catch (e) {
        await call(cfg, `/runs/${run.id}/status`, { status: 'failed', message: `Agent could not open Claude: ${e.message}` });
      }
    }
  } catch (e) {
    if (online !== false) console.error(`Cannot reach ${cfg.server}: ${e.message}`);
    online = false;
  }
  setTimeout(tick, POLL_MS);
}
tick();
