import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const LANGS = ['en', 'ru'];
const STORAGE_KEY = 'dash.lang';

const dict = {
  en: {
    'app.tagline': 'Personal dashboard and AI assistant',
    'app.loading': 'Loading…',
    'nav.tasks': 'Recurring tasks',
    'nav.todos': 'Tasks',
    'todos.title': 'Tasks',
    'todos.placeholder': 'Task title, then Enter',
    'todos.due': 'Due date',
    'todos.today': 'Today',
    'todos.tomorrow': 'Tomorrow',
    'todos.note': 'Description',
    'todos.save': 'Save',
    'todos.edit': 'Click to edit',
    'todos.empty': 'No tasks. Type a title above and press Enter.',
    'err.bad_date': 'Invalid date',
    'nav.store': 'Automation store',
    'nav.agent': 'Agent',
    'nav.logout': 'Log out',
    'agent.online': 'online',
    'agent.offline': 'offline',
    'login.noClientId': 'GOOGLE_CLIENT_ID is not set on the server',
    'login.devTitle': 'Local login (DEV_AUTH)',
    'login.devButton': 'Log in locally',
    'login.privacy': 'Privacy policy',
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
    'err.empty_message': 'Message is empty',
    'err.run_finished': 'The run has already finished',
    'tasks.openChat': 'Open chat',
    'tasks.awaiting': 'waiting for your reply',
    'chat.starting': 'Starting Claude on your computer…',
    'chat.working': 'Claude is working',
    'chat.steps': '{n} steps',
    'chat.placeholder': 'Message to Claude…',
    'chat.placeholderWaiting': 'Claude is waiting for your reply…',
    'chat.send': 'Send',
    'chat.finished': 'The run has finished.',
    'chat.confirmCancel': 'Stop this run?',
    'chat.agentOffline': 'The agent on your computer is offline. Start it, and the run will continue.',
    'tool.browser_open': 'Opening {detail}',
    'tool.browser': 'Working in Chrome',
    'tool.read': 'Reading {detail}',
    'tool.write': 'Saving {detail}',
    'tool.command': 'Running a command',
    'tool.report': 'Updating status in Dash',
    'tool.prepare': 'Getting ready for the task',
    'tool.web': 'Looking up {detail}',
    'tool.other': 'Working ({detail})',
  },
  ru: {
    'app.tagline': 'Личный дашборд и ИИ-ассистент',
    'app.loading': 'Загрузка…',
    'nav.tasks': 'Регулярные дела',
    'nav.todos': 'Задачи',
    'todos.title': 'Задачи',
    'todos.placeholder': 'Название задачи и Enter',
    'todos.due': 'Срок',
    'todos.today': 'Сегодня',
    'todos.tomorrow': 'Завтра',
    'todos.note': 'Описание',
    'todos.save': 'Сохранить',
    'todos.edit': 'Нажмите, чтобы изменить',
    'todos.empty': 'Задач нет. Введите название выше и нажмите Enter.',
    'err.bad_date': 'Неверная дата',
    'nav.store': 'Магазин автоматизаций',
    'nav.agent': 'Агент',
    'nav.logout': 'Выйти',
    'agent.online': 'онлайн',
    'agent.offline': 'офлайн',
    'login.noClientId': 'GOOGLE_CLIENT_ID не задан на сервере',
    'login.devTitle': 'Локальный вход (DEV_AUTH)',
    'login.devButton': 'Войти локально',
    'login.privacy': 'Политика конфиденциальности',
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
    'err.empty_message': 'Пустое сообщение',
    'err.run_finished': 'Запуск уже завершён',
    'tasks.openChat': 'Открыть чат',
    'tasks.awaiting': 'ждёт вашего ответа',
    'chat.starting': 'Запускаю Claude на вашем компьютере…',
    'chat.working': 'Claude работает',
    'chat.steps': 'шагов: {n}',
    'chat.placeholder': 'Сообщение для Claude…',
    'chat.placeholderWaiting': 'Claude ждёт вашего ответа…',
    'chat.send': 'Отправить',
    'chat.finished': 'Запуск завершён.',
    'chat.confirmCancel': 'Остановить этот запуск?',
    'chat.agentOffline': 'Агент на вашем компьютере не на связи. Запустите его, и запуск продолжится.',
    'tool.browser_open': 'Открываю {detail}',
    'tool.browser': 'Работаю в Chrome',
    'tool.read': 'Читаю {detail}',
    'tool.write': 'Сохраняю {detail}',
    'tool.command': 'Выполняю команду',
    'tool.report': 'Обновляю статус в Dash',
    'tool.prepare': 'Готовлюсь к задаче',
    'tool.web': 'Ищу {detail}',
    'tool.other': 'Работаю ({detail})',
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
