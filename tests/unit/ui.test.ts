import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignInScreen } from '../../packages/ui/SignInScreen';
import { signInScenes } from '../../packages/ui/scenes/sign-in';

test('Q17 all five sign-in scenes render deterministically from props alone', () => {
  assert.equal(signInScenes.length, 5);
  for (const scene of signInScenes) {
    const first = renderToStaticMarkup(createElement(SignInScreen, scene.props));
    assert.equal(first, renderToStaticMarkup(createElement(SignInScreen, scene.props)));
    assert.match(first, /Signing in doesn’t move any NIM/);
    if (scene.props.state.status === 'waiting') {
      assert.match(first, /disabled/);
      assert.match(first, /Approve in Nimiq Pay/);
    }
  }
});
