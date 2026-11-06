/** Shape the server reads for the join/commit sheet; shared so the client never imports it. */
export interface JoinView {
  squadId: string;
  squad: { name: string; mode: 'A' | 'B'; targetLuna: number | null; goalAt: number; memberCount: number };
  /** null until the viewer is signed in, or when the chain read failed. */
  member: { activeBalanceLuna: number | null; otherCommitmentsLuna: number; readAt: number } | null;
  delegation: string | null;
  minimumLuna: number;
}
