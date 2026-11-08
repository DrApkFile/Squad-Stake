import { formatPercent } from './format';
import { DEFAULT_LANG, strings, type Lang } from './i18n';

/**
 * What Squad Stake knows about the validator a **new** staker would join (PRD §7.7). Every
 * field is nullable because the source is a separate service: when Nimiq's Validators API
 * cannot be read, `fallback` is true and the screen says the fee and payout type are unknown
 * rather than showing a figure nobody read (AGENTS.md "Never fabricate").
 */
export interface PoolView {
  address: string;
  /** The pool's own name, or null when only the chain knew about this validator. */
  name: string | null;
  /** Fraction of 1, as the Validators API publishes it (0.05 = 5 %). */
  feeFraction: number | null;
  payout: 'restake' | 'direct' | 'none' | null;
  /** Free text from the pool, e.g. "Every 12 hours" or a cron expression. */
  payoutSchedule: string | null;
  /** True when the pool directory was unreachable and the choice used chain data alone. */
  fallback: boolean;
}

export interface PoolCardProps {
  pool: PoolView;
  lang?: Lang | undefined;
}

/** The pool, named before the approval that joins it. Pure display: the choice itself is made
 * on the server (apps/web/src/server/core/validator-choice.ts). */
export function PoolCard({ pool, lang = DEFAULT_LANG }: PoolCardProps) {
  const s = strings(lang);
  const name = pool.name ?? pool.address;
  return (
    <section className="pool-card" data-fallback={pool.fallback ? 'yes' : 'no'}>
      <h2 className="section-title">{s.pool.term}</h2>
      <p className="pool-name">
        {pool.feeFraction === null
          ? s.pool.nameOnly(name)
          : s.pool.nameFee(name, formatPercent(pool.feeFraction, lang))}
      </p>
      <p className="pool-address mono">{pool.address}</p>
      {pool.fallback ? <>
        <p className="status-title">{s.pool.fallbackTitle}</p>
        <p className="field-hint">{s.pool.fallbackBody}</p>
      </> : <>
        {pool.feeFraction === null && <p className="field-hint">{s.pool.feeUnknown}</p>}
        {pool.payout === 'restake' && <p className="field-hint">{s.pool.payoutRestake}</p>}
        {pool.payout === 'direct' && <p className="field-hint">
          {pool.payoutSchedule === null || pool.payoutSchedule === ''
            ? s.pool.payoutDirect
            : s.pool.payoutDirectSchedule(pool.payoutSchedule)}
        </p>}
        <p className="field-hint">{s.pool.spread}</p>
        <p className="fine-print fine-print-left">{s.pool.source}</p>
      </>}
    </section>
  );
}
