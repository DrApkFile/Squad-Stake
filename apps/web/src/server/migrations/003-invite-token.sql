-- 003: keep the invite token so a member can share it again.
--
-- Until now the token existed only as `invite_token_hash`, so the invite link could be shown
-- exactly once, on the screen that created the squad. Screen 5 has to offer a share link, and a
-- member who closed that screen had no way back to it — a dead end in a P0 flow.
--
-- Why storing it is acceptable here, where a session token is not:
--   * The guard in briefing/FAILURE_MODES.md is "invite link guessing", answered by 128 bits of
--     randomness. Storing the token does not help a guesser.
--   * Hashing additionally protects against disclosure of the database. For a session token that
--     means impersonating a wallet; for an invite token it means being able to join a squad, and
--     joining still requires a signed-in wallet of your own and grants only the right to see that
--     squad's commitments and statuses. It moves no funds: nothing moves without a tap in Nimiq Pay.
--   * The hash column stays, and it stays the lookup path, so the invite flow is unchanged.
--
-- Nullable because squads created before this migration have no recoverable token; their page
-- says so and offers the public proof link instead, rather than inventing a link.
ALTER TABLE squads ADD COLUMN IF NOT EXISTS invite_token text
  CHECK (invite_token IS NULL OR invite_token ~ '^[0-9a-f]{32}$');
