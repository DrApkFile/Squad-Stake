/**
 * What the demo video records, in the order the narration needs it.
 *
 * `clip` shots are the real app driven by real taps against the local database and live
 * testnet reads. `still` shots are dev `/scenes` fixture frames: those are static by design
 * (the fixtures pass a fixed `t`), so they are captured once at 3× and animated in the
 * composition. Nothing here is a real squad or a real wallet — every figure is hand-written
 * sample data, which the video labels on screen (AGENTS.md "UI purity" 5).
 */

/** A sample address from packages/ui/scenes/demo: shape-valid, invented, never funded. */
export const SAMPLE_RECIPIENT = 'NQ09TXTM6VS94F5S8CGQ5MJAVRQNYBB132FL';
/** Two addresses that really are stakers on Nimiq testnet, so the squad page in this video
 *  derives "Saved" and "Leaving" from live chain reads rather than from a fixture. Read
 *  2026-11-11: NQ14 TEMC… has 877,265 NIM active; NQ22 11TS… has 0 active and 110 NIM
 *  inactive (inactiveFrom 16,251,210). They are seeded as members by seed-squad.mjs. */
export const REAL_STAKERS = [
  { address: 'NQ14 TEMC ANU0 CELF GBTQ GN3R 86L9 CXDD 83R7', commitLuna: 40_000_000_00 },
  { address: 'NQ22 11TS NJ8N BMD0 UVUM E0KL 2RPU NHM1 2RS8', commitLuna: 11_000_000 },
];

const scene = (id, overrides = {}) => ({
  id: `scene-${id}`, url: `/scenes?scene=${id}&theme=${overrides.theme ?? 'light'}&w=390`,
  still: true, settle: 1600, ...overrides,
});

export const SHOTS = [
  // --- The real app, driven by real taps -------------------------------------------------
  {
    id: 'app-welcome', url: '/?as=alice', settle: 2200, tail: 900,
    steps: [
      { wait: 2600 },
      { scroll: 400, after: 1500 },
      { scroll: 0, after: 1100 },
      { tap: 'Sign in with Nimiq Pay', before: 500, after: 600 },
      { awaitText: 'YOUR SQUADS', timeout: 45_000, after: 1800 },
    ],
  },
  {
    id: 'app-my-squads', session: 'alice', url: '/squads', settle: 2000,
    steps: [{ wait: 1200 }, { tap: 'Create squad', after: 600 },
      { awaitText: ['BEFORE YOU START', 'NEW SQUAD'], timeout: 45_000, after: 1600 }],
  },
  {
    id: 'app-create', session: 'alice', url: '/squads/new', settle: 2000, tail: 1200,
    steps: [
      { wait: 1100 },
      // PRD §9.0: the privacy notice gates the first create, and it is worth showing.
      { tap: 'Got it', after: 600 },
      { awaitText: 'NEW SQUAD', timeout: 45_000, after: 1500 },
      { tap: 'Trip', after: 1500 },
      { tap: 'Shared goal', after: 1200 },
      { type: { label: 'Total target (NIM)', text: '1200', perChar: 150 }, after: 800 },
      { type: { label: 'Recipient address', text: SAMPLE_RECIPIENT, perChar: 38 }, after: 900 },
      { scroll: 'bottom', after: 1000 },
      { tap: 'Create squad', after: 900 },
      { awaitText: 'Share this link', timeout: 45_000, after: 2200 },
      { tap: 'Copy link', after: 2000 },
      { tap: 'Open the squad', after: 900 },
      { awaitText: 'MEMBERS', timeout: 45_000, after: 2400 },
    ],
    // The squad the flow really created, so every shot after this one is about that squad.
    exports: `(async () => {
      const match = location.pathname.match(/\\/squads\\/([0-9a-f-]{36})/);
      if (!match) return { note: 'not on a squad page: ' + location.pathname };
      const body = await (await fetch('/api/squads/' + match[1])).json();
      const dig = (key) => {
        const stack = [body];
        while (stack.length > 0) {
          const node = stack.pop();
          if (node && typeof node === 'object') {
            if (key in node && node[key] !== undefined) return node[key];
            for (const value of Object.values(node)) if (value && typeof value === 'object') stack.push(value);
          }
        }
        return null;
      };
      return { squadId: match[1], inviteToken: dig('inviteToken'), shortId: dig('shortId') };
    })()`,
  },
  {
    // The invite as a friend first meets it: signed out, "Invited to …", then the real
    // waiting-for-approval state. Nimiq Pay's own sheet is never recreated (AGENTS.md).
    id: 'app-invite', freshSession: true, settle: 2000, tail: 1400,
    url: (ctx) => `/s/${ctx.inviteToken}`,
    // No tap: signed out and outside Nimiq Pay the app offers its deeplink rather than a
    // signature it cannot take (PRD §9.1), which is the honest state of this screen here.
    // The approval itself is a motion card in the video; Nimiq Pay's sheet is never recreated.
    steps: [{ wait: 2600 }, { scroll: 260, after: 1800 }, { scroll: 0, after: 1200 }],
  },
  {
    id: 'app-commit', session: 'bob', settle: 2400, tail: 1400,
    url: (ctx) => `/s/${ctx.inviteToken}`,
    // Bob is not a staker yet, so this is PRD §7.3's not-staking branch: a suggested share,
    // the pool Squad Stake picked with its name and fee, and "Create staker in Nimiq Pay".
    // The tap is not taken — there is no wallet here — and the video cuts to the approval card.
    steps: [
      { wait: 1800 },
      { type: { label: 'commitment', text: '300', perChar: 200 }, after: 1200 },
      { scroll: 300, after: 2000 },
      { scroll: 'bottom', after: 2200 },
    ],
  },
  {
    // The money shot: a real squad page whose member statuses are live testnet reads.
    id: 'app-squad', session: 'alice', settle: 3000, tail: 1200,
    url: (ctx) => `/squads/${ctx.squadId}`,
    steps: [
      { awaitText: 'MEMBERS', timeout: 45_000, after: 1400 },
      { scroll: 380, after: 1800 },
      { tap: 'Refresh', after: 3000 },
      { scroll: 'bottom', after: 1600 },
    ],
  },
  {
    id: 'app-proof', freshSession: true, settle: 2600, tail: 1200,
    url: (ctx) => `/proof/${ctx.shortId ?? ctx.squadId}`,
    steps: [{ wait: 2000 }, { scroll: 380, after: 2000 }, { scroll: 820, after: 2000 },
      { scroll: 'bottom', after: 2000 }],
  },

  // --- Stills of the real components, for the states a wallet is needed to reach ---------
  scene('pool-restake'),
  scene('commit-waiting'),
  scene('commit-pending'),
  scene('commit-committed'),
  scene('tx-status-pending'),
  scene('tx-status-done'),
  scene('squad-page-every-stage'),
  scene('squad-page-leave-by'),
  scene('squad-page-leaving-countdown'),
  scene('squad-page-withdrawn'),
  scene('squad-page-share-paid'),
  scene('leaving-start'),
  scene('leaving-countdown'),
  scene('leaving-releasable-ticked'),
  scene('leaving-retired'),
  scene('leaving-withdrawn-shared-goal'),
  scene('pay-ready'),
  scene('pay-paid-squad-complete'),
  scene('proof-view-payments'),
  scene('my-squads-several'),
  scene('member-backed'),
  scene('member-short'),
  scene('member-unstaking'),
];
