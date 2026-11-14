// Automation progress report. Claude calls it from the run window:
//   node report.js <runId> <running|succeeded|failed> "<message>"
import { loadConfig, call } from './config.js';

const [runId, status, ...rest] = process.argv.slice(2);
if (!runId || !['running', 'succeeded', 'failed'].includes(status)) {
  console.error('Usage: node report.js <runId> <running|succeeded|failed> "<message>"');
  process.exit(1);
}
const cfg = loadConfig();
try {
  await call(cfg, `/runs/${runId}/status`, { status, message: rest.join(' ') || undefined });
  console.log(`Run #${runId}: status ${status} sent to Dash`);
} catch (e) {
  console.error(`Could not send the status: ${e.message}`);
  process.exit(1);
}
