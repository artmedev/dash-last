import pg from 'pg';

// DATE -> 'YYYY-MM-DD' string, no timezone shifts
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const q = (text, params) => pool.query(text, params);

export async function migrate() {
  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_sub TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      picture TEXT,
      agent_token_hash TEXT,
      agent_last_seen TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      start_date DATE NOT NULL,
      recurrence TEXT NOT NULL,
      automation_slug TEXT,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS completions (
      id SERIAL PRIMARY KEY,
      task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      period_key TEXT NOT NULL,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (task_id, period_key)
    );
    CREATE TABLE IF NOT EXISTS runs (
      id SERIAL PRIMARY KEY,
      task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      params JSONB NOT NULL DEFAULT '{}'::jsonb,
      message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'en';
    -- Run chat: Claude's messages, its tool activity and the user's replies
    CREATE TABLE IF NOT EXISTS run_messages (
      id SERIAL PRIMARY KEY,
      run_id INT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      role TEXT NOT NULL,              -- 'assistant' | 'user' | 'activity' | 'system'
      text TEXT NOT NULL,
      delivered BOOLEAN NOT NULL DEFAULT false,  -- user messages: already passed to Claude
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS run_messages_run_idx ON run_messages (run_id, id);
    -- true while Claude has finished its turn and waits for the user's reply
    ALTER TABLE runs ADD COLUMN IF NOT EXISTS awaiting_user BOOLEAN NOT NULL DEFAULT false;
    -- Claude Code session id: lets a restarted agent resume the same conversation
    ALTER TABLE runs ADD COLUMN IF NOT EXISTS claude_session TEXT;
    -- One-off tasks (Todoist-like): a title, an optional note and due date, done once
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      due_date DATE,
      done_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS todos_user_idx ON todos (user_id);
    -- Goals: a title and a set of tasks; progress = done tasks / all tasks.
    -- Deleting a goal keeps its tasks (they go back to the plain task list).
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS goals_user_idx ON goals (user_id);
    ALTER TABLE todos ADD COLUMN IF NOT EXISTS goal_id INT REFERENCES goals(id) ON DELETE SET NULL;
  `);
}
