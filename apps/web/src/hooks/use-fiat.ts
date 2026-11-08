'use client';

import { useEffect, useState } from 'react';
import type { FiatRate } from '@squad-stake/ui';
import { hostFiat } from '../wallet/host';
import { priceResponse } from '../core/squad-contract';

/**
 * PRD §9.11. The estimate follows the currency the member chose in Nimiq Pay
 * (`getHostFiat()`), so it is read after mount: on the server there is no host to ask, and
 * guessing a currency from a language would be inventing one.
 *
 * Returns null until a price has actually arrived, and stays null if the source fails or does
 * not quote that currency — the screens render no estimate at all in that case, which is the
 * point of the rule (AGENTS.md "Never fabricate").
 */
export function useFiat(): FiatRate | null {
  const [rate, setRate] = useState<FiatRate | null>(null);
  useEffect(() => {
    const currency = hostFiat();
    // Outside Nimiq Pay nobody has told us a currency, so no estimate is shown.
    if (currency === undefined) return;
    let live = true;
    void (async () => {
      try {
        const response = await fetch(`/api/price?currency=${encodeURIComponent(currency)}`,
          { headers: { accept: 'application/json' } });
        const parsed = priceResponse.parse(await response.json());
        if (live && parsed.ok) setRate(parsed.price);
      } catch {
        // A price is a nicety: a failure shows nothing and is never retried in a loop.
      }
    })();
    return () => { live = false; };
  }, []);
  return rate;
}
