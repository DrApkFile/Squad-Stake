import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BORDER_PERIOD_SECONDS, COUNT_UP_SECONDS, REDUCED_MOTION_T, clamp01, countUp, cursorVisible,
  easeOutCubic, entranceProgress, ringAngle, ringDirection, ringPeriod, seatAngle, tickerOffset,
  typedChars, typingDoneAt,
} from '../../packages/ui/motion';

test('Q17 every motion value is a pure function of t, so one t always gives one frame', () => {
  for (const t of [0, 0.4, 1.237, 4, 37.5, 600]) {
    assert.equal(ringAngle(t, 38), ringAngle(t, 38));
    assert.equal(countUp(t, 740_000_000), countUp(t, 740_000_000));
    assert.equal(typedChars(t, 42), typedChars(t, 42));
    assert.equal(tickerOffset(t, 5), tickerOffset(t, 5));
    assert.equal(entranceProgress(t, 3), entranceProgress(t, 3));
  }
  // Rotation is normalised to one turn, so a long-running scene never drifts into huge angles.
  assert.ok(ringAngle(1e6, 38) >= 0 && ringAngle(1e6, 38) < 360);
  assert.equal(ringAngle(0, 38), 0);
  assert.equal(ringAngle(19, 38), 180);
  // Alternating directions (the brief): the second ring runs backwards.
  assert.equal(ringDirection(0), 1);
  assert.equal(ringDirection(1), -1);
  assert.equal(ringAngle(19, 38, -1), 180);
  assert.equal(ringAngle(1, 4, -1), 270);
  // Ring periods stay inside the brief's 30–60 s window.
  for (let index = 0; index < 4; index++) {
    assert.ok(ringPeriod(index) >= 30 && ringPeriod(index) <= 60, `ring ${index}`);
  }
  assert.equal(BORDER_PERIOD_SECONDS, 6);
});

test('Q17 the typewriter starts after the delay, lands on the full line and then holds', () => {
  const line = 'Save together. Nobody holds the pot.';
  assert.equal(typedChars(0, line.length), 0);
  assert.equal(typedChars(0.39, line.length), 0);          // nothing before the 0.4 s delay
  assert.equal(typedChars(0.4 + 0.035, line.length), 1);   // 35 ms per character
  // Sampled mid-character, not on the boundary: a frame time is never exactly a tick.
  assert.equal(typedChars(0.4 + 10.5 * 0.035, line.length), 10);
  assert.equal(typedChars(1e6, line.length), line.length); // never overruns the line
  // Rounded to the millisecond, so the value is byte-identical in markup on every machine.
  assert.equal(typingDoneAt(line.length), 1.66);
  // The cursor blinks while typing and is steady once the line is complete.
  assert.equal(cursorVisible(0.1, line.length), true);
  assert.equal(cursorVisible(0.6, line.length), false);
  assert.equal(cursorVisible(typingDoneAt(line.length) + 5, line.length), true);
});

test('Q17 the count-up eases to the exact target in integer luna and never overshoots', () => {
  const target = 740_000_000;
  assert.equal(countUp(0, target), 0);
  assert.equal(countUp(COUNT_UP_SECONDS, target), target);
  assert.equal(countUp(COUNT_UP_SECONDS + 100, target), target);
  assert.ok(Number.isInteger(countUp(0.7, target)));
  assert.ok(countUp(0.7, target) < target);
  // Monotone, so the number never counts backwards mid-scene.
  let previous = -1;
  for (let t = 0; t <= COUNT_UP_SECONDS; t += 0.05) {
    const value = countUp(t, target);
    assert.ok(value >= previous, `t=${t}`);
    previous = value;
  }
  assert.equal(countUp(1, 0), 0);
  assert.equal(countUp(1, -5), 0);
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(clamp01(-3), 0);
  assert.equal(clamp01(3), 1);
  assert.equal(clamp01(Number.NaN), 0);
});

test('Q17 the reduced-motion instant is past every entrance, so a frozen frame is complete', () => {
  assert.equal(entranceProgress(REDUCED_MOTION_T, 0), 1);
  assert.equal(entranceProgress(REDUCED_MOTION_T, 12), 1);
  assert.equal(countUp(REDUCED_MOTION_T, 740_000_000), 740_000_000);
  assert.equal(typedChars(REDUCED_MOTION_T, 36), 36);
  assert.equal(cursorVisible(REDUCED_MOTION_T, 36), true);
  // Seats are evenly spread and carry the ring's own rotation.
  assert.equal(seatAngle(0, 4, 0), 0);
  assert.equal(seatAngle(1, 4, 0), 90);
  assert.equal(seatAngle(1, 4, 45), 135);
  assert.equal(seatAngle(0, 0, 10), 0);
  assert.equal(tickerOffset(0, 5), 0);
  assert.ok(tickerOffset(8, 5) > 0 && tickerOffset(8, 5) < 1);
  assert.equal(tickerOffset(5 * 3.2, 5), 0);               // one full loop
});
