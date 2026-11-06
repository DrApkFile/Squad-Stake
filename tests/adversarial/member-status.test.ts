import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deriveMemberStatus } from '../../apps/web/src/server/core/member-status';
import { recorded } from '../support/rpc';

test('Q04 negative, fractional and overflowing commitments cannot silently produce BACKED', () => {
  for (const commitments of [[-1], [0.5], [NaN], [Infinity], [Number.MAX_SAFE_INTEGER, 1]]) {
    assert.throws(() => deriveMemberStatus({ staker: recorded.staker.response.result.data, commitments,
      headBlock: recorded.head.response.result.data, releaseBlock: null }), RangeError);
  }
});
