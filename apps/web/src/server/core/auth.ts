import { verifyInput, type VerifyInput } from '../../core/auth-contract';

export interface Challenge {
  id: string;
  message: string;
  expiresAt: number;
  consumedAt: number | null;
}
export interface Session {
  tokenHash: string;
  address: string;
  publicKey: string;
  expiresAt: number;
}
export interface AuthStore {
  insertChallenge(challenge: Challenge): Promise<void>;
  getChallenge(id: string): Promise<Challenge | null>;
  consumeAndCreateSession(id: string, now: number, session: Session): Promise<boolean>;
  getSession(tokenHash: string, now: number): Promise<Session | null>;
}
export interface AuthDependencies {
  now(): number;
  uuid(): string;
  randomToken(): string;
  hash(value: string): string;
  verify(message: string, publicKey: string, signature: string): string | null;
  store: AuthStore;
  origin: string;
}
type Verification = { ok: true; token: string; address: string; expiresAt: number }
  | { ok: false; code: 'AUTH_REFUSED' | 'INVALID_INPUT' };

export function createAuthService(deps: AuthDependencies) {
  return {
    async challenge(binding: string) {
      const id = deps.uuid();
      const expiresAt = deps.now() + 300_000;
      // PRD §11 + S5: sign the nonce, origin, deadline and browser binding together.
      // The signer is only known after sign(); never ask for an unverified address.
      const message = `Squad Stake sign-in\nOrigin: ${deps.origin}\nChallenge: ${id}\nExpires: ${new Date(expiresAt).toISOString()}\nBrowser: ${deps.hash(binding)}\nNo transaction or transfer is requested.`;
      await deps.store.insertChallenge({ id, message, expiresAt, consumedAt: null });
      return { id, message, expiresAt };
    },
    async verify(input: VerifyInput, binding: string): Promise<Verification> {
      const parsed = verifyInput.safeParse(input);
      if (!parsed.success) return { ok: false, code: 'INVALID_INPUT' };
      const challenge = await deps.store.getChallenge(parsed.data.id);
      const now = deps.now();
      if (!binding || !challenge || challenge.consumedAt !== null || challenge.expiresAt <= now
        || !challenge.message.includes(`\nBrowser: ${deps.hash(binding)}\n`)) {
        return { ok: false, code: 'AUTH_REFUSED' };
      }
      const { publicKey, signature } = parsed.data;
      const address = deps.verify(challenge.message, publicKey, signature);
      if (!address) return { ok: false, code: 'AUTH_REFUSED' };
      const token = deps.randomToken();
      const session = { tokenHash: deps.hash(token), address, publicKey, expiresAt: now + 604_800_000 };
      // Conditional consume + session insert MUST be atomic (FAILURE_MODES concurrent updates).
      const saved = await deps.store.consumeAndCreateSession(challenge.id, deps.now(), session);
      return saved ? { ok: true, token, address, expiresAt: session.expiresAt }
        : { ok: false, code: 'AUTH_REFUSED' };
    },
    async session(token: string) {
      if (!/^[a-f\d]{64}$/.test(token)) return null;
      return deps.store.getSession(deps.hash(token), deps.now());
    },
  };
}
export type AuthService = ReturnType<typeof createAuthService>;
