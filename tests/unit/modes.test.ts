import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createSquadInput } from '../../apps/web/src/core/squad-contract';
import { CreateSquadScreen } from '../../packages/ui/CreateSquadScreen';
import { createSquadScenes } from '../../packages/ui/scenes/squad-flow';
import { ADDRESSES, harness } from '../support/squads';

/**
 * PRD §4 fixes which letter means what: **A = shared goal** (one total plus a recipient) and
 * **B = together goals** (personal targets, nobody pays anybody). Every layer encodes that
 * separately — the wire contract, the service, the database CHECKs and the form's own words —
 * so this test pins all of them together. Swapping them would silently point a squad's
 * payments at the wrong mode, which no type would catch.
 */
const goalAt = Date.parse('2026-12-18T00:00:00Z');

test('§4 mode A is the shared goal with a total and a recipient; mode B has neither', () => {
  const shared = createSquadInput.safeParse({ mode: 'A', name: 'Lisbon in April', goalAt,
    targetLuna: 1_200_000_000, recipient: ADDRESSES.bob });
  assert.ok(shared.success);
  const together = createSquadInput.safeParse({ mode: 'B', name: 'Winter buffers', goalAt,
    personalTargetLuna: 200_000_000 });
  assert.ok(together.success);

  // A shared goal without a recipient, or with a personal target, is not a shared goal.
  assert.equal(createSquadInput.safeParse({ mode: 'A', name: 'x', goalAt,
    targetLuna: 1_000 }).success, false);
  assert.equal(createSquadInput.safeParse({ mode: 'A', name: 'x', goalAt,
    personalTargetLuna: 1_000, recipient: ADDRESSES.bob }).success, false);
  // Together goals must carry no recipient and no shared total (the same rule the two
  // CHECK constraints in migrations/002-squads.sql enforce in the database).
  assert.equal(createSquadInput.safeParse({ mode: 'B', name: 'x', goalAt,
    personalTargetLuna: 1_000, recipient: ADDRESSES.bob }).success, false);
  assert.equal(createSquadInput.safeParse({ mode: 'B', name: 'x', goalAt,
    targetLuna: 1_000 }).success, false);
});

test('§4 the service stores a recipient only for mode A and a personal target only for mode B', async () => {
  const context = harness();
  const shared = await context.squads.create(ADDRESSES.alice, { mode: 'A', name: 'Lisbon in April',
    goalAt: context.at() + 30 * 86_400_000, targetLuna: 1_200_000_000, recipient: ADDRESSES.bob });
  assert.ok(shared.ok);
  const sharedRow = context.rows.get(shared.id);
  assert.equal(sharedRow?.mode, 'A');
  assert.equal(sharedRow?.targetLuna, 1_200_000_000);
  assert.equal(sharedRow?.recipient, ADDRESSES.bob);
  assert.equal((await context.store.getMembership(shared.id, ADDRESSES.alice))?.personalTargetLuna, null);

  const together = await context.squads.create(ADDRESSES.alice, { mode: 'B', name: 'Winter buffers',
    goalAt: context.at() + 30 * 86_400_000, personalTargetLuna: 200_000_000 });
  assert.ok(together.ok);
  const togetherRow = context.rows.get(together.id);
  assert.equal(togetherRow?.mode, 'B');
  assert.equal(togetherRow?.targetLuna, null);
  assert.equal(togetherRow?.recipient, null);
  assert.equal((await context.store.getMembership(together.id, ADDRESSES.alice))?.personalTargetLuna,
    200_000_000);
});

test('§4 the create form words each mode the way the PRD does and asks for its own fields', () => {
  const render = (id: string) => {
    const scene = createSquadScenes.find((entry) => entry.id === id);
    assert.ok(scene, id);
    return renderToStaticMarkup(createElement(CreateSquadScreen as never, scene.props as never));
  };
  const modeA = render('create-mode-a');
  // React emits the boolean attribute before value, so the pair is matched in that order.
  assert.match(modeA, /checked=""[^>]*value="A"/);
  assert.match(modeA, /Shared goal/);
  assert.match(modeA, /Total target \(NIM\)/);
  assert.match(modeA, /Recipient address/);
  assert.doesNotMatch(modeA, /Your target \(NIM\)/);

  const modeB = render('create-mode-b');
  assert.match(modeB, /checked=""[^>]*value="B"/);
  assert.match(modeB, /Together goals/);
  assert.match(modeB, /Your target \(NIM\)/);
  // A together-goals squad never collects a recipient: there is nobody to pay.
  assert.doesNotMatch(modeB, /Recipient address/);
  assert.doesNotMatch(modeB, /Total target \(NIM\)/);

  // Both descriptions stay attached to the right letter.
  assert.match(modeA, /value="A"[\s\S]{0,400}One total\. On goal day everyone pays the recipient\./);
  assert.match(modeA, /value="B"[\s\S]{0,400}Own targets, shared date\. Nobody pays anybody\./);
});
