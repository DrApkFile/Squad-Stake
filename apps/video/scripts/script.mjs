/**
 * The narration, as spoken and as captioned.
 *
 * `text` is what the captions show; `say` is what Kokoro is given when the two must differ.
 * They differ for one reason only: espeak phonemises the all-caps "NIM" as "en-eye-em"
 * (checked against the phonemizer on 2026-11-11), so the spoken form is "Nim". "Nimiq" itself
 * phonemises correctly as nˈɪmɪk and is left alone.
 *
 * Section ids match the composition's scenes, so a re-timed section moves its pictures with it.
 */
export const SECTIONS = [
  {
    id: 'hook', kind: 'graphics',
    lines: [
      { text: 'Five friends are saving for a trip.' },
      { text: 'One of them collects everyone’s money.' },
      { text: 'Now one person carries all the risk — and everyone else just has to trust them.' },
    ],
  },
  {
    id: 'problem', kind: 'graphics',
    lines: [
      { text: 'That’s how group saving works almost everywhere.' },
      { text: 'Someone holds the pot.' },
      { text: 'Nobody else can check it.' },
      { text: 'And while it waits, the money does nothing.' },
      { text: 'If the holder spends it, disappears, or simply makes a mistake, the whole group loses.' },
    ],
  },
  {
    id: 'intro', kind: 'logo',
    lines: [
      { text: 'So we built Squad Stake, a mini app inside Nimiq Pay.' },
      { text: 'Save together for anything — and nobody holds the pot.' },
      { text: 'Every member’s share stays in their own wallet, staked on the Nimiq blockchain, earning while the squad waits.' },
      { text: 'And the squad’s progress isn’t typed into a database.' },
      { text: 'It’s read straight from the chain.' },
    ],
  },
  {
    id: 'create', kind: 'screens',
    lines: [
      { text: 'Signing in is one signature in Nimiq Pay — no account, no password.' },
      { text: 'Create a squad: pick a quick start, like a trip, set a goal day, and choose how you save.' },
      { text: 'Together goals, where everyone saves their own target.' },
      { text: 'Or a shared goal, with one total and a recipient fixed up front.' },
      { text: 'Then share one invite link.' },
    ],
  },
  {
    id: 'commit', kind: 'screens',
    lines: [
      { text: 'Friends open the link, sign in, and commit their share.' },
      { text: 'If they’re not staking yet, Squad Stake picks a staking pool that actually pays its stakers — and shows its name and fee — before Nimiq Pay asks for approval.' },
      { text: 'The stake never leaves their wallet.' },
      { text: 'A commitment only counts once its transaction is executed and final on the chain.' },
    ],
  },
  {
    id: 'progress', kind: 'screens',
    lines: [
      { text: 'Now everyone sees honest progress.' },
      { text: 'Saved, short, leaving, back in the wallet — every status comes from a fresh chain read, with its age right beside it.' },
      { text: 'Nobody sees anyone else’s balance.' },
      { text: 'And the public proof page lets anyone repeat the check themselves.' },
    ],
  },
  {
    id: 'goalday', kind: 'screens',
    lines: [
      { text: 'Unstaking on Nimiq takes twelve to twenty-four hours, so Squad Stake tells each member exactly when to start leaving.' },
      { text: 'Three approvals bring the NIM back.', say: 'Three approvals bring the Nim back.' },
      { text: 'For a shared goal, each share is paid to the recipient — and verified on the chain.' },
    ],
  },
  {
    id: 'nim', kind: 'graphics',
    lines: [
      { text: 'NIM does the heavy lifting: identity by signature, native staking for the savings, payments, and the chain as the source of truth.',
        say: 'Nim does the heavy lifting: identity by signature, native staking for the savings, payments, and the chain as the source of truth.' },
      { text: 'Trips, gifts, rent buffers, group purchases — anything a group saves for.' },
    ],
  },
  {
    id: 'close', kind: 'endcard',
    lines: [
      { text: 'No custody. No trust required. Just proof.' },
      { text: 'Squad Stake — save together, nobody holds the pot.' },
    ],
  },
];

/** 2:45 exactly, as asked. */
export const TOTAL_SECONDS = 165;
