# Dash

[Russian version](README-ru.md)

Personal dashboard and AI assistant. Address: `dash.artme.dev`. Stack: React (Vite), Node/Express, Postgres.

```
server/   API, Google sign-in, recurring tasks, automation store, runs
  automations/<slug>/prompt.md   Claude's instructions for an automation
client/   React UI
agent/    local agent: picks up runs and opens Claude Code + Claude in Chrome
```

## Local run

```bash
npm install
npm run db            # Postgres in Docker on port 5434
npm run dev:server    # http://localhost:3001 (reads settings from server/.env)
npm run dev:client    # http://localhost:5173
```

Create `server/.env` from `server/.env.example`. While `DEV_AUTH=1`, the login page has a
"Sign in locally" button, so Google is not needed for development.

## Google sign-in

1. Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID.
2. Type **Web application**. Under Authorized JavaScript origins add
   `http://localhost:5173` and `https://dash.artme.dev`.
3. On the OAuth consent screen set the status to In production (External), so any Google user
   can sign in (only the email/profile scopes are needed, no Google verification required).
4. Put the Client ID into `GOOGLE_CLIENT_ID` in `server/.env` and restart the server.

## Automations and the local agent

1. You need Claude Code (`claude`) and the Claude in Chrome extension in your Chrome.
2. On the site: "Agent" → "Issue agent token", then run the command shown:
   ```bash
   npm run agent -- --server http://localhost:5173 --token <token>
   ```
   After that `npm run agent` is enough.
3. On a task with an automation press "▶ Run". The agent opens a Claude Code window with the prompt
   (`agent/runs/run-<id>.md`). Claude works in your Chrome; you sign in to sites and enter SMS codes,
   and you confirm submitting the declaration and the payment.
4. Claude reports status with `node agent/report.js <id> running|succeeded|failed "..."`.
   After `succeeded` the task is marked done for the current period.

## Deploy

TODO: homelab.
