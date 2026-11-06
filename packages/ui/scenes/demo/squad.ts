// Hand-written sample data for the how-to walkthrough video and the scene gallery
// (AGENTS.md "UI purity" 5). Realistic but invented: no real squad, no real wallet, and
// never a usage statistic. Fixed instants keep every render deterministic.
export const DEMO_LABEL = 'SAMPLE DATA — not a real squad';

export const demoNow = Date.parse('2026-11-06T10:15:00Z');
export const demoReadAt = demoNow - 24_000;
export const demoGoalAt = Date.parse('2026-12-18T00:00:00Z');

export const demoSharedSquad = {
  name: 'Lisbon in April',
  mode: 'A' as const,
  targetLuna: 1_200_000_000,
  goalAt: demoGoalAt,
  memberCount: 4,
};
export const demoTogetherSquad = {
  name: 'Winter buffers',
  mode: 'B' as const,
  targetLuna: null,
  goalAt: demoGoalAt,
  memberCount: 3,
};
/** 2,000 NIM commitment, 3,500 NIM active stake: the numbers the walkthrough narrates. */
export const demoCommitmentLuna = 200_000_000;
export const demoFreeLuna = 150_000_000;
