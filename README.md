# Dash

[Russian version](README-ru.md)

Personal dashboard and AI assistant. Address: `dash.artme.dev`. Stack: React (Vite), Node/Express, Postgres.

```
server/   API, Google sign-in, recurring tasks, automation store, runs
  automations/<slug>/prompt.md      Claude instructions for the automation (English)
  automations/<slug>/prompt-ru.md   Russian version, kept in sync with prompt.md
client/   React UI (English by default, EN/RU switcher saved per user)
agent/    local agent: claims runs and opens Claude Code + Claude in Chrome
```

## Local run

```bash
npm install
npm run db            # Postgres in Docker on port 5434
npm run dev:server    # http://localhost:3001 (API only, settings from server/.env)
npm run dev:client    # http://localhost:5173 (UI)
```

`server/.env` is created from `server/.env.example`. While `DEV_AUTH=1`, the login page has a
"Log in locally" button, so Google is not needed for development.

## Google sign-in

1. Google Cloud Console → Google Auth Platform → set up the app (External audience).
2. Clients → Create client → **Web application**. Authorized JavaScript origins:
   `http://localhost:5173`, `http://localhost`, `https://dash.artme.dev`.
3. Put the Client ID into `GOOGLE_CLIENT_ID` in `server/.env` and restart the server.
   The Client Secret is not used.
4. While the app is in Testing, only test users (Audience → Test users) can sign in.
   Publishing requires a homepage and privacy policy URL on `dash.artme.dev`.

## Automations and the local agent

The agent is a small Node.js program on your computer. It talks only to the Dash server: every
5 seconds it asks for new runs and, for each run, opens a Claude Code window with Claude in Chrome.
The server cannot reach your computer behind a router, so the computer connects to the server.
The agent token identifies your agent, so nobody else can pick up your runs.

1. You need Claude Code (`claude`) and the Claude in Chrome extension in your Chrome.
2. On the site: "Agent" → "Issue agent token", then run the shown command:
   ```bash
   npm run agent -- --server http://localhost:5173 --token <token>
   ```
   Server and token are saved to `agent/.agent.json`; afterwards `npm run agent` is enough.
   The agent works while the command is running. To keep it running in the background (Windows),
   after the first run:
   ```bash
   npm run agent:install     # Task Scheduler: starts hidden at logon, and right now
   npm run agent:status      # task state and the last lines of agent/agent.log
   npm run agent:uninstall   # stop and remove
   ```
3. Click "▶ Run" on an automated task. The agent opens a Claude Code window with the prompt
   (`agent/runs/run-<id>.md`) in your language. Claude works in your Chrome; you log in to sites and
   type SMS codes yourself, and you confirm the declaration submission and the payment.
4. Claude reports status with `node agent/report.js <id> running|succeeded|failed "..."`.
   After `succeeded` the task is marked done for the current period.

## Languages

- Code, comments and logs are in English.
- Docs and prompts: English file by default, Russian twin with the `-ru` suffix next to it.
  When one changes, the other is updated in the same commit.
- UI: English by default; the EN/RU switcher in the top right saves the choice to the user profile.

## Deploy

TODO: homelab.
