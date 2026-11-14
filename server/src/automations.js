import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { previousMonth } from './periods.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../automations');

// Automation store catalog. `fields` are the settings the user fills in
// when adding an automated task. User-facing texts are { en, ru }.
export const AUTOMATIONS = [
  {
    slug: 'georgia-small-business-tax',
    title: {
      en: 'Georgia small business tax payment',
      ru: 'Оплата налога Грузия малый бизнес',
    },
    description: {
      en:
        'Monthly: file the small business declaration on rs.ge (USD income converted to GEL at the ' +
        'National Bank of Georgia rate, cumulative total), check the tax debt, prepare the treasury ' +
        'payment in the bank, save the declaration and receipt to a folder and append a line to the records file.',
      ru:
        'Ежемесячно: подать декларацию малого бизнеса на rs.ge (доход в USD пересчитывается в лари ' +
        'по курсу НБГ, нарастающим итогом), проверить задолженность, подготовить платёж в казначейство ' +
        'в банке, сохранить декларацию и чек в папку и дописать запись в файл учёта.',
    },
    defaultTitle: {
      en: 'Tax payment (Georgia, small business)',
      ru: 'Оплата налога (Грузия, малый бизнес)',
    },
    defaultRecurrence: 'monthly',
    defaultDay: 1,
    fields: [
      {
        key: 'documents_folder',
        label: {
          en: 'Folder for declarations and receipts (on your computer)',
          ru: 'Папка для деклараций и чеков (на вашем компьютере)',
        },
        placeholder: { en: 'D:\\Docs\\Taxes', ru: 'D:\\Docs\\Taxes' },
        required: true,
      },
      {
        key: 'bank',
        label: { en: 'Bank', ru: 'Банк' },
        default: 'Credo (mycredo.ge)',
        required: true,
      },
      {
        key: 'records_file',
        label: {
          en: 'Paid taxes records file (records.txt, read-only)',
          ru: 'Файл учёта уплаченных налогов (records.txt, только чтение)',
        },
        placeholder: { en: 'Google Drive link or local path', ru: 'Ссылка на Google Диск или локальный путь' },
        required: true,
      },
    ],
    // Extra run parameters derived from the period:
    // a task due on November 1 files the October declaration.
    runParams: (period) => ({ tax_month: previousMonth(period.due) }),
  },
];

export const findAutomation = (slug) => AUTOMATIONS.find((a) => a.slug === slug);

export const publicCatalog = () => AUTOMATIONS.map(({ runParams, ...rest }) => rest);

export function renderPrompt(slug, vars) {
  const tpl = fs.readFileSync(path.join(dir, slug, 'prompt.md'), 'utf8');
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
}
