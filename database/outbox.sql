CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY,
  event_id text NOT NULL,
  aggregate_id text NOT NULL,
  event_name text NOT NULL,
  occurred_on timestamptz NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbox_events_status_idx ON outbox_events (status, occurred_on);

CREATE TABLE IF NOT EXISTS dead_letters (
  id uuid PRIMARY KEY,
  event_id text NOT NULL,
  aggregate_id text NOT NULL,
  event_name text NOT NULL,
  occurred_on timestamptz NOT NULL,
  payload jsonb NOT NULL,
  error text NOT NULL,
  attempts integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dead_letters_event_id_idx ON dead_letters (event_id);
