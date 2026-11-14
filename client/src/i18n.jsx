import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const LANGS = ['en', 'ru'];
const STORAGE_KEY = 'dash.lang';

const dict = {
  en: {
    'app.tagline': 'Personal dashboard and AI assistant',
    'app.loading': 'Loading…',
    'nav.tasks': 'Recurring tasks',
    'nav.store': 'Automation store',
    'nav.agent': 'Agent',
    'nav.logout': 'Log out',
    'agent.online': 'online',
    'agent.offline': 'offline',
    'login.noClientId': 'GOOGLE_CLIENT_ID is not set on the server',
    'login.devTitle': 'Local login (DEV_AUTH)',
    'login.devButton': 'Log in locally',
    'tasks.title': 'Recurring tasks',
    'tasks.add': '＋ Add',
    'tasks.addAuto': '⚙ Add automated',
    'tasks.showDone': 'Show completed',
    'tasks.storeLink': 'Automation store →',
    'tasks.empty': 'No tasks yet. Click “＋ Add”.',
    'tasks.due': 'due {date}',
    'tasks.automation': 'automation',
    'tasks.run': 'run #{id}: {status}',
    'tasks.start': '▶ Run',
    'tasks.cancel': 'Cancel',
    'tasks.delete': 'Delete',
    'tasks.confirmDelete': 'Delete “{title}”?',
    'form.new': 'New task',
    'form.chooseAutomation': 'Choose an automation',
    'form.title': 'Title',
    'form.date': 'Date',
    'form.recurrence': 'Recurrence',
    'form.back': '← Back to list',
    'form.submit': 'Add',
    'store.title': 'Automation store',
    'store.back': '← Recurring tasks',
    'store.defaults': 'Default: {recurrence}',
    'store.defaultDay': ', on day {day}',
    'store.add': 'Add to tasks',
    'settings.title': 'Local agent',
    'settings.intro':
      'Automations are executed by Claude Code on your computer: it works in your own Chrome through the ' +
      'Claude in Chrome extension. The agent picks up runs from this site and opens a Claude window where ' +
      'you type SMS codes and answer questions.',
    'settings.status': 'Status:',
    'settings.lastSeen': '(last seen: {time})',
    'settings.issue': 'Issue agent token',
    'settings.reissue': 'Issue new token',
    'settings.confirmReissue': 'The old token will stop working. Continue?',
    'settings.tokenOnce': 'The token is shown once. Run on your computer:',
    'settings.tokenSaved': 'Settings are saved to agent/.agent.json; afterwards “npm run agent” is enough.',
    'rec.once': 'Once',
    'rec.daily': 'Daily',
    'rec.weekly': 'Weekly',
    'rec.monthly': 'Monthly',
    'rec.quarterly': 'Quarterly',
    'rec.yearly': 'Yearly',
    'run.pending': 'waiting for agent',
    'run.claimed': 'agent is starting',
    'run.running': 'running',
    'run.succeeded': 'done',
    'run.failed': 'failed',
    'run.cancelled': 'cancelled',
    'err.title_required': 'Enter a title',
    'err.date_required': 'Enter a date',
    'err.bad_recurrence': 'Unknown recurrence',
    'err.automation_not_found': 'Automation not found',
    'err.field_required': 'Fill in “{field}”',
    'err.not_automated': 'This task has no automation',
    'err.run_active': 'Automation is already running',
    'err.not_found': 'Not found',
  },
  ru: {
    'app.tagline': 'Личный дашборд и ИИ-ассистент',
    'app.loading': 'Загрузка…',
    'nav.tasks': 'Регулярные дела',
    'nav.store': 'Магазин автоматизаций',
    'nav.agent': 'Агент',
    'nav.logout': 'Выйти',
    'agent.online': 'онлайн',
    'agent.offline': 'офлайн',
    'login.noClientId': 'GOOGLE_CLIENT_ID не задан на сервере',
    'login.devTitle': 'Локальный вход (DEV_AUTH)',
    'login.devButton': 'Войти локально',
    'tasks.title': 'Регулярные дела',
    'tasks.add': '＋ Добавить',
    'tasks.addAuto': '⚙ Добавить автоматизированное',
    'tasks.showDone': 'Отображать выполненные',
    'tasks.storeLink': 'Магазин автоматизаций →',
    'tasks.empty': 'Дел пока нет. Нажмите «＋ Добавить».',
    'tasks.due': 'срок {date}',
    'tasks.automation': 'автоматизация',
    'tasks.run': 'запуск #{id}: {status}',
    'tasks.start': '▶ Запустить',
    'tasks.cancel': 'Отменить',
    'tasks.delete': 'Удалить',
    'tasks.confirmDelete': 'Удалить «{title}»?',
    'form.new': 'Новое дело',
    'form.chooseAutomation': 'Выберите автоматизацию',
    'form.title': 'Название',
    'form.date': 'Дата',
    'form.recurrence': 'Регулярность',
    'form.back': '← К списку',
    'form.submit': 'Добавить',
    'store.title': 'Магазин автоматизаций',
    'store.back': '← Регулярные дела',
    'store.defaults': 'По умолчанию: {recurrence}',
    'store.defaultDay': ', {day}-го числа',
    'store.add': 'Добавить в дела',
    'settings.title': 'Локальный агент',
    'settings.intro':
      'Автоматизации выполняет Claude Code на вашем компьютере: он работает в вашем Chrome через ' +
      'расширение Claude in Chrome. Агент забирает запуски с сайта и открывает окно Claude, ' +
      'в котором вы вводите SMS-коды и отвечаете на вопросы.',
    'settings.status': 'Статус:',
    'settings.lastSeen': '(последний раз: {time})',
    'settings.issue': 'Выпустить токен агента',
    'settings.reissue': 'Выпустить новый токен',
    'settings.confirmReissue': 'Старый токен перестанет работать. Продолжить?',
    'settings.tokenOnce': 'Токен показывается один раз. Запустите на компьютере:',
    'settings.tokenSaved': 'Параметры сохранятся в agent/.agent.json, дальше достаточно «npm run agent».',
    'rec.once': 'Однократно',
    'rec.daily': 'Ежедневно',
    'rec.weekly': 'Еженедельно',
    'rec.monthly': 'Ежемесячно',
    'rec.quarterly': 'Ежеквартально',
    'rec.yearly': 'Ежегодно',
    'run.pending': 'ждёт агента',
    'run.claimed': 'агент запускает',
    'run.running': 'выполняется',
    'run.succeeded': 'выполнено',
    'run.failed': 'ошибка',
    'run.cancelled': 'отменено',
    'err.title_required': 'Укажите название',
    'err.date_required': 'Укажите дату',
    'err.bad_recurrence': 'Неизвестная регулярность',
    'err.automation_not_found': 'Автоматизация не найдена',
    'err.field_required': 'Заполните поле «{field}»',
    'err.not_automated': 'Это дело без автоматизации',
    'err.run_active': 'Автоматизация уже запущена',
    'err.not_found': 'Не найдено',
  },
};

export const RECURRENCES = ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

const readStored = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return LANGS.includes(v) ? v : 'en';
  } catch {
    return 'en';
  }
};

const I18nContext = createContext(null);

/**
 * Language source: the logged-in user's profile (users.lang) wins;
 * before login the last choice from localStorage is used; default is English.
 */
export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStored);

  const setLang = useCallback((l) => {
    if (!LANGS.includes(l)) return;
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const value = useMemo(() => {
    const t = (key, vars = {}) => {
      const s = dict[lang][key] ?? dict.en[key] ?? key;
      return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
    };
    /** Picks the current language from a { en, ru } object (or returns a plain string as is). */
    const pick = (v) => (v && typeof v === 'object' ? v[lang] ?? v.en : v);
    /** Translates an API error using its code, falling back to the English message. */
    const tError = (e, vars) => (e?.code && dict.en[`err.${e.code}`] ? t(`err.${e.code}`, vars) : e?.message);
    const formatDate = (s) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB');
    };
    return { lang, setLang, t, pick, tError, formatDate };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
