// Runs the agent in the background on Windows via Task Scheduler.
//   node agent/service.js install    start at logon (hidden), and start right now
//   node agent/service.js uninstall  stop and remove the task
//   node agent/service.js status     show the task state and the log tail
//
// The task runs only while the user is logged on: the agent has to open visible
// Claude Code windows in the user's session.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { AGENT_DIR } from './config.js';

const TASK = 'Dash Agent';
const LAUNCHER = path.join(AGENT_DIR, 'service.cmd');
const LOG = path.join(AGENT_DIR, 'agent.log');

if (process.platform !== 'win32') {
  console.error('Background mode is implemented for Windows only. Run "npm run agent" in a terminal instead.');
  process.exit(1);
}

const schtasks = (...args) => execFileSync('schtasks.exe', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function install() {
  if (!fs.existsSync(path.join(AGENT_DIR, '.agent.json'))) {
    console.error('Run the agent once first: npm run agent -- --server <url> --token <token>');
    process.exit(1);
  }
  fs.writeFileSync(
    LAUNCHER,
    ['@echo off', 'chcp 65001 >nul', `cd /d "${AGENT_DIR}"`, `"${process.execPath}" index.js >> "${LOG}" 2>&1`, ''].join('\r\n'),
  );
  // conhost --headless keeps the agent's own console hidden; Claude windows are opened with `start` and stay visible
  schtasks('/Create', '/TN', TASK, '/TR', `conhost.exe --headless cmd.exe /c "${LAUNCHER}"`, '/SC', 'ONLOGON', '/RL', 'LIMITED', '/IT', '/F');
  schtasks('/Run', '/TN', TASK);
  console.log(`Installed and started "${TASK}". It will start automatically at logon. Log: ${LOG}`);
}

function uninstall() {
  try { schtasks('/End', '/TN', TASK); } catch { /* not running */ }
  try {
    schtasks('/Delete', '/TN', TASK, '/F');
    console.log(`Removed "${TASK}".`);
  } catch {
    console.log(`"${TASK}" is not installed.`);
  }
}

function status() {
  try {
    const out = schtasks('/Query', '/TN', TASK, '/FO', 'LIST');
    const line = out.split(/\r?\n/).find((l) => /^Status:/i.test(l));
    console.log(`"${TASK}": installed, ${line ? line.trim() : 'status unknown'}`);
  } catch {
    console.log(`"${TASK}": not installed`);
  }
  if (fs.existsSync(LOG)) {
    const tail = fs.readFileSync(LOG, 'utf8').trim().split(/\r?\n/).slice(-10).join('\n');
    console.log(`\nLast log lines (${LOG}):\n${tail}`);
  }
}

const cmd = process.argv[2];
if (cmd === 'install') install();
else if (cmd === 'uninstall') uninstall();
else if (cmd === 'status') status();
else {
  console.error('Usage: node agent/service.js install|uninstall|status');
  process.exit(1);
}
