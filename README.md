# Dash

[Russian version](README-ru.md)

Personal dashboard and AI assistant. Address: `dash.artme.dev`. Stack: React (Vite), Node/Express, Postgres.

```
server/   API, Google sign-in, recurring tasks, automation store, runs
  automations/<slug>/prompt.md      Claude instructions for the automation (English)
  automations/<slug>/prompt-ru.md   Russian version, kept in sync with prompt.md
client/   React UI (English by default, EN/RU switcher saved per user)
agent/    local agent: claims runs and runs Claude Code (headless) + Claude in Chrome
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
   npm run agent:install     # autostart at logon (hidden, no admin rights), and starts now
   npm run agent:status      # autostart and running state, last lines of agent/agent.log
   npm run agent:uninstall   # stop and remove
   ```
3. Click "▶ Run" on an automated task: the run chat opens on the site. The agent starts Claude Code
   without a window, with the prompt (`agent/runs/run-<id>.md`) in your language. You talk to Claude in
   the Dash chat; Claude works in your Chrome. You log in to sites and type SMS codes yourself, and you
   confirm the declaration submission and the payment. Claude's stderr is logged to `agent/runs/run-<id>.log`.
4. Claude reports status with `node agent/report.js <id> running|succeeded|failed "..."`.
   After `succeeded` the task is marked done for the current period.

## Privacy during runs

- The agent masks personal identifiers (personal/taxpayer numbers, IBAN, card and document numbers,
  e-mails, phones) **before** anything is sent to the Dash server. Extra terms, e.g. your name as banks
  write it, go into `agent/private.json` (`{ "redact": ["SURNAME"] }`), which stays on your computer.
- The prompt forbids Claude to mention names, numbers or balances in the chat and tells it to read only
  the values it needs.
- When a run ends, the agent deletes Claude Code's local transcript of it (page texts, screenshots),
  its file history and the run's prompt and log files.
- Limitation: Claude has to see the pages it works on, so page content goes to the Claude model under
  your Claude account. Only a scripted (non-AI) path for the known steps would avoid that.

## Languages

- Code, comments and logs are in English.
- Docs and prompts: English file by default, Russian twin with the `-ru` suffix next to it.
  When one changes, the other is updated in the same commit.
- UI: English by default; the EN/RU switcher in the top right saves the choice to the user profile.

## Deploy

Production runs on the homelab at https://dash.artme.dev, deployed with rostok (`D:devostok`,
stack `stacks/dash`): the app container (this repo's `Dockerfile`) and its own Postgres behind Traefik.

1. Production settings live in `.env.prod` (not committed; variables in `.env.prod.example`).
2. Deploy: in `D:devostok` run
   ```bash
   ./rostok.sh deploy homelab dash
   ```
   `rostok.sh` mounts the Docker build inputs and `.env.prod` from this repo into the stack.
3. The local agent points to the server in `agent/.agent.json` (`"server": "https://dash.artme.dev"`).
