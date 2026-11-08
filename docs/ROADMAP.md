# Roadmap

## Scheduled in this build (full scope kept — PRD §10)
- ~~Pool-aware validator choice~~ — **built 2026-11-08** (Nimiq's Validators API; a validator
  that pays stakers nothing, or that the API does not list, is ineligible; fallback to the
  chain-only rule, said so on screen)
- ~~Earned-since-joining (S4b)~~ — **built 2026-11-08**, and S4b closed: Nimiq publishes no
  pool payout address, so a restake pool is measured exactly and a direct pool shows "—" with
  the reason (`briefing/REALITY_SPIKES.md`)
- ~~Fiat estimates~~ — **built 2026-11-08** (CoinGecko, keyless, 10-minute cache, "≈ … ·
  estimate", hidden when the price or the currency is unavailable)
- ~~Languages: es, de, fr, pt~~ — **built 2026-11-08** (one typed catalogue, the error
  catalogue included; Nimiq Pay's language, then the browser's, then English)
- ~~Squad templates~~ — **built 2026-11-08** (trip, gift, gadget, rent buffer, event; mode,
  name and date only — never the recipient)

Still unproven for all five: none of them has run on a real phone inside Nimiq Pay, and no
staking transaction has ever been sent with a pool-aware delegation.

## Not in the build
- Push/email reminders (needs infra; later)
