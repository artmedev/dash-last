// Current period of a recurring task.
// All dates are 'YYYY-MM-DD' strings computed in UTC to avoid timezone shifts.

export const RECURRENCES = ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmt = (dt) => dt.toISOString().slice(0, 10);
const lastDay = (y, m0) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const ymd = (y, m0, d) => fmt(new Date(Date.UTC(y, m0, Math.min(d, lastDay(y, m0)))));

export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parse(s));

/** @returns {{key: string, due: string}} */
export function currentPeriod(recurrence, startDate, today) {
  const start = parse(startDate);
  // If the task has not started yet, compute relative to its start date
  const ref = parse(today) < start ? start : parse(today);
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const day = start.getUTCDate();

  switch (recurrence) {
    case 'once':
      return { key: 'once', due: startDate };
    case 'daily':
      return { key: fmt(ref), due: fmt(ref) };
    case 'weekly': {
      const monday = new Date(ref);
      monday.setUTCDate(ref.getUTCDate() - ((ref.getUTCDay() + 6) % 7));
      const due = new Date(monday);
      due.setUTCDate(monday.getUTCDate() + ((start.getUTCDay() + 6) % 7));
      return { key: fmt(monday), due: fmt(due) };
    }
    case 'monthly':
      return { key: `${y}-${String(m + 1).padStart(2, '0')}`, due: ymd(y, m, day) };
    case 'quarterly': {
      const qStart = m - (m % 3);
      const offset = start.getUTCMonth() % 3;
      return { key: `${y}-Q${qStart / 3 + 1}`, due: ymd(y, qStart + offset, day) };
    }
    case 'yearly':
      return { key: String(y), due: ymd(y, start.getUTCMonth(), day) };
    default:
      throw new Error(`Unknown recurrence: ${recurrence}`);
  }
}

/** Month preceding the date: '2026-11-01' -> '2026-10' */
export function previousMonth(date) {
  const d = parse(date);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return fmt(d).slice(0, 7);
}
