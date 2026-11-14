# Dash

[English version](README.md)

Личный дашборд и ИИ-ассистент. Адрес: `dash.artme.dev`. Стек: React (Vite), Node/Express, Postgres.

```
server/   API, вход через Google, регулярные дела, магазин автоматизаций, запуски
  automations/<slug>/prompt.md      инструкции Claude для автоматизации (английский)
  automations/<slug>/prompt-ru.md   русская версия, синхронизируется с prompt.md
client/   React-интерфейс (по умолчанию английский, переключатель EN/RU сохраняется для пользователя)
agent/    локальный агент: забирает запуски и открывает Claude Code + Claude in Chrome
```

## Локальный запуск

```bash
npm install
npm run db            # Postgres в Docker на порту 5434
npm run dev:server    # http://localhost:3001 (только API, настройки из server/.env)
npm run dev:client    # http://localhost:5173 (интерфейс)
```

`server/.env` создаётся из `server/.env.example`. Пока `DEV_AUTH=1`, на странице входа есть
кнопка «Войти локально», и Google для разработки не нужен.

## Вход через Google

1. Google Cloud Console → Google Auth Platform → настроить приложение (аудитория External).
2. Clients → Create client → **Web application**. Authorized JavaScript origins:
   `http://localhost:5173`, `http://localhost`, `https://dash.artme.dev`.
3. Впишите Client ID в `GOOGLE_CLIENT_ID` в `server/.env` и перезапустите сервер.
   Client Secret не используется.
4. Пока приложение в статусе Testing, войти могут только тестовые пользователи (Audience → Test users).
   Для публикации нужны ссылки на главную и политику конфиденциальности на `dash.artme.dev`.

## Автоматизации и локальный агент

Агент — маленькая программа на Node.js на вашем компьютере. Он общается только с сервером Dash:
раз в 5 секунд спрашивает новые запуски и для каждого открывает окно Claude Code с Claude in Chrome.
Сервер не может достучаться до компьютера за роутером, поэтому соединение начинает компьютер.
Токен агента подтверждает, что это ваш агент, и чужой не сможет забирать ваши запуски.

1. Нужны Claude Code (`claude`) и расширение Claude in Chrome в вашем Chrome.
2. На сайте: «Агент» → «Выпустить токен агента», затем выполните показанную команду:
   ```bash
   npm run agent -- --server http://localhost:5173 --token <токен>
   ```
   Сервер и токен сохраняются в `agent/.agent.json`, дальше достаточно `npm run agent`.
   Агент работает, пока команда запущена.
3. На деле с автоматизацией нажмите «▶ Запустить». Агент откроет окно Claude Code с промптом
   (`agent/runs/run-<id>.md`) на вашем языке. Claude работает в вашем Chrome; вход на сайты и SMS-коды
   вводите вы, отправку декларации и платёж подтверждаете вы.
4. Claude сообщает статус командой `node agent/report.js <id> running|succeeded|failed "..."`.
   После `succeeded` дело отмечается выполненным в текущем периоде.

## Языки

- Код, комментарии и логи — на английском.
- Документация и промпты: английский файл по умолчанию, рядом русский с суффиксом `-ru`.
  Если меняется один, второй обновляется в том же коммите.
- Интерфейс: по умолчанию английский; переключатель EN/RU справа вверху сохраняет выбор в профиле.

## Деплой

TODO: homelab.
