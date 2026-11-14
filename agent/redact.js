// Masks personal data before anything leaves the user's computer for the Dash server
// (chat messages, activity lines, run status messages).
//
// Built-in patterns cover identifiers that never need to appear in the chat. Extra terms
// (e.g. the user's name as written on bank pages) can be listed in agent/private.json:
//   { "redact": ["SURNAME", "Name Surname"] }
// That file stays on the computer and is not committed.
import fs from 'node:fs';
import path from 'node:path';
import { AGENT_DIR } from './config.js';

const MASK = '•••';

// Public codes that look like identifiers but must stay readable
const ALLOW = new Set(['101001000']); // Georgian treasury: unified tax code

const PATTERNS = [
  /\bGE\d{2}[A-Z]{2}\d{16}\b/gi,                 // Georgian IBAN
  /\b(?:\d[ -]?){13,19}\b/g,                     // card / long account numbers
  /\b\d{2}[A-Z]{3}\d{6}\b/g,                     // rs.ge declaration registration numbers
  /\bN:\s?\d{6,}\b/g,                            // rs.ge document numbers
  /\b\d{9,11}\b/g,                               // personal / taxpayer codes (9-11 digits)
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,                   // e-mail
  /\+?995[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}/g, // Georgian phone numbers
];

function privateTerms() {
  try {
    const { redact = [] } = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, 'private.json'), 'utf8'));
    return redact.filter((t) => typeof t === 'string' && t.trim().length >= 3).sort((a, b) => b.length - a.length);
  } catch {
    return [];
  }
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function redact(text) {
  if (!text) return text;
  let out = String(text);
  for (const term of privateTerms()) out = out.replace(new RegExp(escape(term), 'gi'), MASK);
  for (const re of PATTERNS) out = out.replace(re, (m) => (ALLOW.has(m.trim()) ? m : MASK));
  return out;
}
