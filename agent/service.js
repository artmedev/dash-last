// Runs the agent in the background on Windows, without admin rights.
//   node agent/service.js install    autostart at logon (hidden) and start right now
//   node agent/service.js uninstall  stop and remove autostart
//   node agent/service.js start      start the hidden background agent now
//   node agent/service.js status     show autostart/running state and the log tail
//
// Autostart uses the per-user registry key HKCU\Software\Microsoft\Windows\CurrentVersion\Run.
// The agent runs in the user's session: Claude works in the user's own Chrome.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { AGENT_DIR } from './config.js';

const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const VALUE = 'DashAgent';
const LOG = path.join(AGENT_DIR, 'agent.log');
const PID_FILE = path.join(AGENT_DIR, 'agent.pid');

if (process.platform !== 'win32') {
  console.error('Background mode is implemented for Windows only. Run "npm run agent" in a terminal instead.');
  process.exit(1);
}

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// At logon a hidden PowerShell runs "service.js start", which detaches a hidden node process
const autostartCommand =
  `powershell.exe -NoProfile -WindowStyle Hidden -Command "& '${process.execPath}' '${path.join(AGENT_DIR, 'service.js')}' start"`;

const runningPid = () => {
  try {
    const pid = Number(fs.readFileSync(PID_FILE, 'utf8'));
    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
};

function stop() {
  const pid = runningPid();
  if (!pid) return false;
  try { run('taskkill.exe', ['/PID', String(pid), '/T', '/F']); } catch { /* already gone */ }
  fs.rmSync(PID_FILE, { force: true });
  return true;
}

function start() {
  const pid = runningPid();
  if (pid) return console.log(`The agent is already running (pid ${pid}).`);
  const logFd = fs.openSync(LOG, 'a');
  const child = spawn(process.execPath, [path.join(AGENT_DIR, 'index.js')], {
    cwd: AGENT_DIR, detached: true, windowsHide: true, stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  console.log(`Agent started in the background (pid ${child.pid}). Log: ${LOG}`);
}

function install() {
  if (!fs.existsSync(path.join(AGENT_DIR, '.agent.json'))) {
    console.error('Run the agent once first: npm run agent -- --server <url> --token <token>');
    process.exit(1);
  }
  run('reg.exe', ['add', RUN_KEY, '/v', VALUE, '/t', 'REG_SZ', '/d', autostartCommand, '/f']);
  console.log('Autostart installed: the agent starts hidden at logon.');
  stop();
  start();
  console.log('Stop any agent you started in a terminal (Ctrl+C), otherwise two agents run at once.');
}

function uninstall() {
  const stopped = stop();
  try {
    run('reg.exe', ['delete', RUN_KEY, '/v', VALUE, '/f']);
    console.log(`Autostart removed${stopped ? ', agent stopped' : ''}.`);
  } catch {
    console.log(`Autostart was not installed${stopped ? '; agent stopped' : ''}.`);
  }
}

function status() {
  let installed = false;
  try { run('reg.exe', ['query', RUN_KEY, '/v', VALUE]); installed = true; } catch { /* not installed */ }
  const pid = runningPid();
  console.log(`Autostart: ${installed ? 'installed' : 'not installed'}; agent: ${pid ? `running (pid ${pid})` : 'not running'}`);
  if (fs.existsSync(LOG)) {
    const tail = fs.readFileSync(LOG, 'utf8').trim().split(/\r?\n/).slice(-10).join('\n');
    console.log(`\nLast log lines (${LOG}):\n${tail}`);
  }
}

const cmd = process.argv[2];
if (cmd === 'install') install();
else if (cmd === 'uninstall') uninstall();
else if (cmd === 'start') start();
else if (cmd === 'status') status();
else {
  console.error('Usage: node agent/service.js install|uninstall|start|status');
  process.exit(1);
}
