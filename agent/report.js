// Reports automation progress. Called by Claude from the run window:
//   node report.js <runId> <running|succeeded|failed> "<message>"
import { loadConfig, call } from './config.js';
import { redact } from './redact.js';

const [runId, status, ...rest] = process.argv.slice(2);
if (!runId || !['running', 'succeeded', 'failed'].includes(status)) {
  console.error('Usage: node report.js <runId> <running|succeeded|failed> "<message>"');
  process.exit(1);
}
const cfg = loadConfig();
try {
  await call(cfg, `/runs/${runId}/status`, { status, message: redact(rest.join(' ')) || undefined });
  console.log(`Run #${runId}: status ${status} sent to Dash`);
} catch (e) {
  console.error(`Failed to send status: ${e.message}`);
  process.exit(1);
}
