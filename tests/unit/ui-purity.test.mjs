import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import { uiPurity } from '../../scripts/ui-purity.mjs';

test('Q17 purity lint refuses network, SDK, host, clocks, randomness and aliases', () => {
  const linter = new Linter();
  const config = { plugins: { squad: { rules: { purity: uiPurity } } }, rules: { 'squad/purity': 'error' } };
  for (const code of [
    'fetch("/api")', 'const request = fetch; request("/api")',
    'import {init} from "@nimiq/mini-app-sdk"', 'import("@nimiq/mini-app-sdk")',
    'window.nimiqPay', 'window["nimiqPay"]', 'Date.now()', 'Date["now"]()',
    'const {now} = Date; now()', 'const clock = Date; clock.now()', 'new Date()',
    'Math.random()', 'Math["random"]()', 'const {random} = Math; random()',
    'import {useEffect as load} from "react"', 'React.useEffect(() => {})',
    'export * from "@nimiq/mini-app-sdk"',
  ]) {
    assert.ok(linter.verify(code, config).some((message) => message.ruleId === 'squad/purity'), code);
  }
  assert.equal(linter.verify('const render = (now) => new Date(now).toISOString(); Math.min(1, 2);', config).length, 0);
});
