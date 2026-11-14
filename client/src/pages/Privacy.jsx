import { Link } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';
import LangSwitch from '../LangSwitch.jsx';

const TEXT = {
  en: {
    title: 'Privacy policy',
    updated: 'Last updated: November 14, 2026',
    back: '← Dash',
    sections: [
      ['What Dash is', 'Dash is a personal dashboard with tasks, recurring tasks and automations that run on your own computer through Claude Code and Claude in Chrome.'],
      ['Data we store', 'Your Google account e-mail, name and profile picture (to sign you in); your tasks and recurring tasks, their settings and completion marks; automation runs and their chat messages, with personal identifiers masked on your computer before they are sent; your interface language.'],
      ['Google sign-in', 'We request only your basic profile (e-mail, name, picture). We do not get access to your Gmail, Drive or any other Google data.'],
      ['Automations', 'Automations run on your computer in your own browser. Logins, passwords and SMS codes are entered by you and never reach Dash. After a run ends, the local Claude Code transcript of it is deleted.'],
      ['Sharing', 'We do not sell or share your data. Data is stored on a server operated by the Dash owner.'],
      ['Deletion', 'You can delete your tasks and recurring tasks at any time. To delete your account and all data, contact the owner of this Dash instance.'],
    ],
  },
  ru: {
    title: 'Политика конфиденциальности',
    updated: 'Обновлено: 14 ноября 2026',
    back: '← Dash',
    sections: [
      ['Что такое Dash', 'Dash — личный дашборд с задачами, регулярными задачами и автоматизациями, которые выполняются на вашем компьютере через Claude Code и Claude in Chrome.'],
      ['Какие данные мы храним', 'Email, имя и фото вашего Google-аккаунта (для входа); ваши задачи и регулярные задачи, их настройки и отметки выполнения; запуски автоматизаций и сообщения их чатов, в которых личные идентификаторы скрываются на вашем компьютере до отправки; язык интерфейса.'],
      ['Вход через Google', 'Мы запрашиваем только базовый профиль (email, имя, фото). Доступа к Gmail, Диску и другим данным Google мы не получаем.'],
      ['Автоматизации', 'Автоматизации работают на вашем компьютере в вашем браузере. Логины, пароли и SMS-коды вы вводите сами, в Dash они не попадают. После завершения запуска его локальный транскрипт Claude Code удаляется.'],
      ['Передача данных', 'Мы не продаём и не передаём ваши данные. Данные хранятся на сервере владельца Dash.'],
      ['Удаление', 'Задачи и регулярные задачи можно удалить в любой момент. Чтобы удалить аккаунт и все данные, напишите владельцу этого экземпляра Dash.'],
    ],
  },
};

export default function Privacy() {
  const { lang } = useI18n();
  const p = TEXT[lang] || TEXT.en;
  return (
    <div className="app privacy">
      <header className="topbar">
        <Link to="/" className="logo">{p.back}</Link>
        <span className="user"><LangSwitch /></span>
      </header>
      <h1>{p.title}</h1>
      <p className="muted small">{p.updated}</p>
      {p.sections.map(([h, body]) => (
        <section key={h}>
          <h3>{h}</h3>
          <p>{body}</p>
        </section>
      ))}
    </div>
  );
}
