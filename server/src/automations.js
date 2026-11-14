import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { previousMonth } from './periods.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../automations');

// Automation store catalog. fields describe the settings that
// the user fills in when adding an automated task.
export const AUTOMATIONS = [
  {
    slug: 'georgia-small-business-tax',
    title: 'Georgia small business tax payment',
    description:
      'Monthly: file the small business declaration on rs.ge (USD income converted to GEL ' +
      'at the NBG rate, cumulative total), check the debt, prepare the treasury payment ' +
      'in the bank, save the declaration and receipt to a folder and add a line to the records file.',
    defaultTitle: 'Tax payment (Georgia, small business)',
    defaultRecurrence: 'monthly',
    defaultDay: 1,
    fields: [
      {
        key: 'documents_folder',
        label: 'Folder for declarations and receipts (on your computer)',
        placeholder: 'D:\\Docs\\Taxes',
        required: true,
      },
      { key: 'bank', label: 'Bank', default: 'Credo (mycredo.ge)', required: true },
      {
        key: 'records_file',
        label: 'Records file of paid taxes (records.txt, read-only)',
        placeholder: 'Google Drive link or local path',
        required: true,
      },
    ],
    // Extra run parameters computed from the period:
    // a task on November 1 files the declaration for October.
    runParams: (period) => ({ tax_month: previousMonth(period.due) }),
  },
];

export const findAutomation = (slug) => AUTOMATIONS.find((a) => a.slug === slug);

export const publicCatalog = () => AUTOMATIONS.map(({ runParams, ...rest }) => rest);

export function renderPrompt(slug, vars) {
  const tpl = fs.readFileSync(path.join(dir, slug, 'prompt.md'), 'utf8');
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
}
