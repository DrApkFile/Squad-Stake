import { MemberList } from './MemberList';
import { ScreenHeader } from './ScreenHeader';
import { formatDay, formatLuna, readAge } from './format';
import type { MemberRowView } from './MemberList';

export interface ProofScreenProps {
  squad: {
    name: string;
    shortId: string;
    mode: 'A' | 'B';
    targetLuna: number | null;
    goalAt: number;
  };
  members: readonly MemberRowView[];
  backedLuna: number | null;
  committedLuna: number;
  now: number;
  readAt: number | null;
  network: string;
  /** The call a reader can repeat to get the same answer. Printed in full, because a proof
   * nobody can re-run is not a proof (briefing/PROOF_PLAN.md). */
  verify: { endpoint: string; method: string };
  apiUrl: string;
  demoLabel?: string | undefined;
}

/** Screen 10. Public: no session, no wallet, no actions. */
export function ProofScreen({
  squad,
  members,
  backedLuna,
  committedLuna,
  now,
  readAt,
  network,
  verify,
  apiUrl,
  demoLabel,
}: ProofScreenProps) {
  return (
    <main className="sheet">
      {/* A reader may have arrived from anywhere, so the way out is forward: the app itself.
          The label says that, rather than repeating the brand line beside it. */}
      <ScreenHeader back={{ label: 'Open Squad Stake', href: '/' }} demoLabel={demoLabel} />
      <div className="sheet-body">
        <p className="eyebrow">PUBLIC PROOF · SQUAD {squad.shortId.toUpperCase()}</p>
        <h1>{squad.name}</h1>
        <p className="intro">
          {squad.mode === 'A' ? 'A shared goal' : 'Together goals'} on Nimiq {network}.{' '}
          {formatLuna(committedLuna)} committed
          {squad.targetLuna === null ? '' : ` of ${formatLuna(squad.targetLuna)}`}, goal day{' '}
          {formatDay(squad.goalAt)}.
        </p>
        <p className="member-status-age">
          {backedLuna === null
            ? 'Backed total: — · no chain read yet'
            : `${formatLuna(backedLuna)} backed by active stake`}
          {' · '}
          {readAge(readAt, now)}
        </p>

        <h2 className="section-title">Members</h2>
        <MemberList members={members} now={now} showFullAddress />

        <h2 className="section-title">Check it yourself</h2>
        <dl className="notice-list">
          <dt>Every status above is a chain read</dt>
          <dd>
            Each member’s status comes from <span className="mono">{verify.method}</span> on{' '}
            <span className="mono">{verify.endpoint}</span>, read when this page was loaded. Nothing
            on this page is stored as truth.
          </dd>
          <dt>Repeat the read</dt>
          <dd className="mono">
            {`curl -s ${verify.endpoint} -H 'content-type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"${verify.method}","params":["<address>",null]}'`}
          </dd>
          <dt>Or read this page as JSON</dt>
          <dd className="mono">{`curl -s ${apiUrl}`}</dd>
        </dl>
        <p className="fine-print fine-print-left">
          Squad Stake never holds anyone’s NIM. Each share sits in its owner’s own wallet, staked
          with a validator of their own.
        </p>
      </div>
    </main>
  );
}
