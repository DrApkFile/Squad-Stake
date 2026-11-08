import { MemberList } from './MemberList';
import { ScreenHeader } from './ScreenHeader';
import { formatDay, formatLuna, readAge } from './format';
import { fiatLine, fiatNote, type FiatRate } from './fiat';
import { DEFAULT_LANG, strings, type Lang } from './i18n';
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
  /** PRD §7.6 / PROOF_PLAN "Verify it yourself": every settlement, with its hash, so a reader
   * with no account can re-check each one on an explorer. Null for Mode B. */
  payments?: {
    recipient: string; owing: number; paid: number;
    rows: readonly { address: string; hash: string | null; verified: boolean; code: string | null }[];
  } | null | undefined;
  /** PRD §9.11: the same estimate a member sees, with its source and age. */
  fiat?: FiatRate | null | undefined;
  demoLabel?: string | undefined;
  lang?: Lang | undefined;
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
  payments = null,
  fiat = null,
  demoLabel,
  lang = DEFAULT_LANG,
}: ProofScreenProps) {
  const s = strings(lang);
  return (
    <main className="sheet">
      {/* A reader may have arrived from anywhere, so the way out is forward: the app itself.
          The label says that, rather than repeating the brand line beside it. */}
      <ScreenHeader back={{ label: s.common.openSquadStake, href: '/' }} demoLabel={demoLabel} />
      <div className="sheet-body">
        <p className="eyebrow">{s.proof.eyebrow(squad.shortId.toUpperCase())}</p>
        <h1>{squad.name}</h1>
        <p className="intro">
          {s.proof.intro(
            squad.mode === 'A' ? s.proof.modeAPhrase : s.proof.modeBPhrase,
            network,
            s.proof.introAmounts(
              formatLuna(committedLuna, lang),
              squad.targetLuna === null ? null : formatLuna(squad.targetLuna, lang),
            ),
            formatDay(squad.goalAt, lang),
          )}
        </p>
        <p className="member-status-age">
          {backedLuna === null
            ? s.common.backedTotalUnread
            : s.proof.backedLine(formatLuna(backedLuna, lang))}
          {' · '}
          {readAge(readAt, now, lang)}
        </p>
        {fiat !== null && (
          <p className="member-status-age squad-fiat">
            {fiatLine(squad.targetLuna ?? committedLuna, fiat, lang)}
          </p>
        )}

        <h2 className="section-title">{s.common.membersSection}</h2>
        <MemberList members={members} now={now} lang={lang} showFullAddress />

        {payments !== null && (
          <>
            <h2 className="section-title">{s.common.paymentsSection}</h2>
            <p className="member-status-age">
              {s.proof.paidToLine(payments.paid, payments.owing)}{' '}
              <span className="mono">{payments.recipient}</span>
            </p>
            <ul className="payment-list">
              {payments.rows.map((row) => (
                <li className="payment-row" key={row.address} data-verified={row.verified ? 'yes' : 'no'}>
                  <span className="payment-who mono">{row.address}</span>
                  <span className="payment-state">
                    {row.verified ? s.common.paymentVerified
                      : row.hash === null ? s.common.paymentNone : s.common.paymentUncounted}
                  </span>
                  {row.hash !== null && <span className="payment-hash mono">{row.hash}</span>}
                </li>
              ))}
            </ul>
            <p className="field-hint">
              {s.proof.paymentsNote(`sq:${squad.shortId}`)}
            </p>
          </>
        )}

        <h2 className="section-title">{s.proof.checkTitle}</h2>
        <dl className="notice-list">
          <dt>{s.proof.readTerm}</dt>
          <dd>{s.proof.readBody(verify.method, verify.endpoint)}</dd>
          <dt>{s.proof.repeatTerm}</dt>
          <dd className="mono">
            {`curl -s ${verify.endpoint} -H 'content-type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"${verify.method}","params":["<address>",null]}'`}
          </dd>
          <dt>{s.proof.jsonTerm}</dt>
          <dd className="mono">{`curl -s ${apiUrl}`}</dd>
        </dl>
        {fiat !== null && <p className="fine-print fine-print-left">{fiatNote(fiat, now, lang)}</p>}
        <p className="fine-print fine-print-left">{s.proof.fineprint}</p>
      </div>
    </main>
  );
}
