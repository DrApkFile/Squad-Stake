-- docs/ARCHITECTURE.md "Data model". CHECK constraints mirror the PRD §8 state machines,
-- so a row the application would consider impossible cannot exist in the database either.

CREATE TABLE squads (
  id uuid PRIMARY KEY,
  short_id text UNIQUE NOT NULL CHECK (short_id ~ '^[0-9a-z]{8}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  mode text NOT NULL CHECK (mode IN ('A', 'B')),
  target_luna bigint CHECK (target_luna IS NULL OR target_luna > 0),
  recipient text CHECK (recipient IS NULL OR recipient ~ '^NQ[0-9]{2}( [0-9A-HJ-NP-VXY]{4}){8}$'),
  goal_at timestamptz NOT NULL,
  organiser text NOT NULL CHECK (organiser ~ '^NQ[0-9]{2}( [0-9A-HJ-NP-VXY]{4}){8}$'),
  invite_token_hash bytea NOT NULL UNIQUE CHECK (octet_length(invite_token_hash) = 32),
  state text NOT NULL CHECK (state IN ('OPEN', 'SAVING', 'LEAVING', 'SETTLING', 'COMPLETED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- PRD §4: Mode A needs a total and a recipient; Mode B must have neither.
  CHECK (mode = 'B' OR (target_luna > 0 AND recipient IS NOT NULL)),
  CHECK (mode = 'A' OR (target_luna IS NULL AND recipient IS NULL))
);
CREATE INDEX squads_organiser ON squads (organiser);

CREATE TABLE memberships (
  squad_id uuid NOT NULL REFERENCES squads(id),
  address text NOT NULL CHECK (address ~ '^NQ[0-9]{2}( [0-9A-HJ-NP-VXY]{4}){8}$'),
  personal_target_luna bigint CHECK (personal_target_luna IS NULL OR personal_target_luna > 0),
  committed_luna bigint NOT NULL DEFAULT 0 CHECK (committed_luna >= 0),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  PRIMARY KEY (squad_id, address),
  CHECK (left_at IS NULL OR left_at >= joined_at),
  -- §7.8: leaving removes the commitment, so a left member cannot still hold one.
  CHECK (left_at IS NULL OR committed_luna = 0)
);
CREATE INDEX memberships_address ON memberships (address) WHERE left_at IS NULL;

CREATE TABLE tracked_txs (
  hash text PRIMARY KEY CHECK (hash ~ '^[0-9a-f]{64}$'),
  address text NOT NULL CHECK (address ~ '^NQ[0-9]{2}( [0-9A-HJ-NP-VXY]{4}){8}$'),
  squad_id uuid NOT NULL REFERENCES squads(id),
  kind text NOT NULL CHECK (kind IN ('create', 'add', 'unstake', 'retire', 'remove', 'pay')),
  expected jsonb NOT NULL,
  state text NOT NULL CHECK (state IN ('SUBMITTED', 'INCLUDED_OK', 'INCLUDED_FAILED', 'UNKNOWN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  checked_at timestamptz,
  -- A state other than the initial one means the chain was actually read.
  CHECK (state = 'SUBMITTED' OR checked_at IS NOT NULL)
);
CREATE INDEX tracked_txs_member ON tracked_txs (squad_id, address);
