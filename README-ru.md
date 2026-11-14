# Dash

Личный дашборд и ИИ-ассистент. Адрес: `dash.artme.dev`. Стек: React (Vite), Node/Express, Postgres.

```
server/   API, Google-вход, регулярные дела, магазин автоматизаций, запуски
  automations/<slug>/prompt.md   инструкции Claude для автоматизации
client/   React-интерфейс
agent/    локальный агент: забирает запуски и открывает Claude Code + Claude in Chrome
```

## Локальный запуск

```bash
npm install
npm run db            # Postgres в Docker на порту 5434
npm run dev:server    # http://localhost:3001 (берёт настройки из server/.env)
npm run dev:client    # http://localhost:5173
```

`server/.env` создаётся из `server/.env.example`. Пока `DEV_AUTH=1`, на странице входа есть
кнопка «Войти локально», и Google для разработки не нужен.

## Вход через Google

1. Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID.
2. Тип **Web application**. В Authorized JavaScript origins добавьте
   `http://localhost:5173` и `https://dash.artme.dev`.
3. На экране OAuth consent screen поставьте статус In production (External), чтобы могли входить
   любые пользователи Google (нужны только scope email/profile, проверка Google не требуется).
4. Впишите Client ID в `GOOGLE_CLIENT_ID` в `server/.env` и перезапустите сервер.

## Автоматизации и локальный агент

1. Нужны Claude Code (`claude`) и расширение Claude in Chrome в вашем Chrome.
2. На сайте: «Агент» → «Выпустить токен агента», затем выполните показанную команду:
   ```bash
   npm run agent -- --server http://localhost:5173 --token <токен>
   ```
   Потом достаточно `npm run agent`.
3. На деле с автоматизацией нажмите «▶ Запустить». Агент откроет окно Claude Code с промптом
   (`agent/runs/run-<id>.md`). Claude работает в вашем Chrome, вход на сайты и SMS-коды вводите вы,
   отправку декларации и платёж подтверждаете вы.
4. Claude сообщает статус командой `node agent/report.js <id> running|succeeded|failed "..."`.
   После `succeeded` дело отмечается выполненным в текущем периоде.

## Деплой

TODO: homelab.
