CREATE TABLE challenges (
  id uuid PRIMARY KEY,
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 2048),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CHECK (consumed_at IS NULL OR consumed_at < expires_at)
);
CREATE INDEX challenges_expiry ON challenges (expires_at);

CREATE TABLE sessions (
  token_hash bytea PRIMARY KEY CHECK (octet_length(token_hash) = 32),
  address text NOT NULL CHECK (address ~ '^NQ[0-9]{2}( [0-9A-HJ-NP-VXY]{4}){8}$'),
  public_key bytea NOT NULL CHECK (octet_length(public_key) = 32),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expiry ON sessions (expires_at);
