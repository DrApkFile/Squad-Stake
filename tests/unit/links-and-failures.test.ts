import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CreateSquadScreen } from '../../packages/ui/CreateSquadScreen';
import { NoticeScreen } from '../../packages/ui/NoticeScreen';
import { ProofScreen } from '../../packages/ui/ProofScreen';
import { SignInScreen } from '../../packages/ui/SignInScreen';
import { SquadScreen } from '../../packages/ui/SquadScreen';
import { shortLink } from '../../packages/ui/format';
import { LANGS, strings } from '../../packages/ui/i18n';
import { noticeScenes } from '../../packages/ui/scenes/notice';
import { signInScenes } from '../../packages/ui/scenes/sign-in';
import { createSquadScenes } from '../../packages/ui/scenes/squad-flow';
import { proofScenes, squadPageScenes } from '../../packages/ui/scenes/squad-page';
import { onwardPath } from '../../apps/web/src/server/lib/session-page';

const render = (component: unknown, props: unknown) =>
  renderToStaticMarkup(createElement(component as never, props as never));
const scene = <T,>(scenes: readonly { id: string; props: T }[], id: string) => {
  const found = scenes.find((entry) => entry.id === id);
  assert.ok(found, id);
  return found.props;
};

test('a link preview is enough to recognise and never enough to retype', () => {
  // The shapes the screens actually hand it: an absolute share link, a short id, an in-app
  // path, and things that are not links at all. It never throws and never invents a character.
  assert.equal(shortLink('https://squad-stake.vercel.app/s/979d0a1b2c3d4e5f70'),
    'squad-stake.vercel.app/s/979d…f70');
  assert.equal(shortLink('https://squad-stake.vercel.app/proof/a1b2c3d4e5f69f'),
    'squad-stake.vercel.app/proof/a1b2…69f');
  // An eight-character short id is already short enough to read whole.
  assert.equal(shortLink('https://squad.example/proof/q7m2bt4h'), 'squad.example/proof/q7m2bt4h');
  assert.equal(shortLink('/s/abcdefghijklmnop'), '/s/abcd…nop');
  assert.equal(shortLink('https://www.example.com/'), 'example.com');
  assert.equal(shortLink('not a link'), 'not a link');
  // A shortened link is never a whole one: the full URL only travels by Share or Copy.
  const full = 'https://squad.example/s/4f1c8a7b2d9e0315a6c4b8d7e2f10934';
  assert.ok(!full.includes(shortLink(full)));
});

test('§9.5 the squad page shows both links as previews, and opens the proof page in the app', () => {
  const props = scene(squadPageScenes, 'squad-page-backed');
  const html = render(SquadScreen, props);
  const squad = props as unknown as { inviteUrl: string; proofUrl: string; proofHref: string };

  // Neither link is printed, and both are recognisable. (The commit action's own href is
  // `/s/<token>` — an in-app route, not a printed URL — which is why the needle is the
  // shareable link the screen would otherwise have shown.)
  assert.ok(!html.includes(squad.inviteUrl), 'the invite URL is never printed');
  assert.ok(!html.includes(squad.proofUrl), 'nor is the proof URL');
  assert.match(html, new RegExp(shortLink(squad.inviteUrl)));
  assert.match(html, new RegExp(shortLink(squad.proofUrl)));

  // The proof page opens in the app, by its own path, carrying where to come back to.
  assert.match(html, new RegExp(`href="${squad.proofHref.replace('?', '\\?')}"`));
  assert.match(html, /View proof page/);
  // Each preview is text, not a control: no anchor, no button, nothing to tap.
  for (const preview of html.match(/<p class="link-preview">.*?<\/p>/g) ?? []) {
    assert.doesNotMatch(preview, /<a |<button/, preview);
  }
  assert.equal((html.match(/class="link-preview"/g) ?? []).length, 2);
});

test('a refused clipboard write says so, on both screens that offer one', () => {
  const quiet = render(SquadScreen, scene(squadPageScenes, 'squad-page-backed'));
  assert.doesNotMatch(quiet, /Could not copy/);

  const failed = render(SquadScreen, scene(squadPageScenes, 'squad-page-copy-failed'));
  // Twice: the invite card and the proof card each own their own verdict.
  assert.equal(failed.match(/Could not copy\. Use Share instead\./g)?.length, 2);
  assert.match(failed, /role="alert"/);

  const create = render(CreateSquadScreen, scene(createSquadScenes, 'create-share-copy-failed'));
  assert.match(create, /Could not copy\. Use Share instead\./);
  // Nothing is lost: the share control is still on the screen.
  assert.match(create, /Share invite/);
});

test('a page that cannot show itself says what happened and offers a way on', () => {
  for (const { id, props } of noticeScenes) {
    const html = render(NoticeScreen, props);
    // What happened, in words, as an alert — not Next's own untranslated default page.
    assert.match(html, /role="alert"/, id);
    assert.match(html, new RegExp(props.title.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), id);
    // And exactly one way on, always.
    assert.match(html, /class="action-bar"/, id);
    assert.match(html, /href="\/"/, id);
  }
  // A server fault names itself, so a member can report the one they hit.
  const error = render(NoticeScreen, scene(noticeScenes, 'notice-server-error'));
  assert.match(error, /Reference 1f4c9ab27de30516/);
  assert.match(error, /Try again/);
  // The retry turns while it runs, like every other control that starts work.
  const retrying = render(NoticeScreen, scene(noticeScenes, 'notice-error-retrying'));
  assert.match(retrying, /aria-busy="true"/);
  assert.match(retrying, /class="spinner"/);
  // A missing page is not an error page: nothing to retry, one way home.
  const missing = render(NoticeScreen, scene(noticeScenes, 'notice-not-found'));
  assert.doesNotMatch(missing, /aria-busy="true"/);
  assert.match(missing, /no NIM has moved/);
});

test('a redirect explains itself, on the screen it lands on', () => {
  // Sent to the entry screen by a members-only page.
  const sent = render(SignInScreen, scene(signInScenes, 'sign-in-sent-here'));
  assert.match(sent, /Sign in to open that page/);
  assert.match(sent, /come straight back/);
  assert.match(sent, /role="status"/);
  // The plain entry screen carries no such card.
  assert.doesNotMatch(render(SignInScreen, scene(signInScenes, 'sign-in-idle')),
    /Sign in to open that page/);

  // Sent to the public view because the viewer is not in the squad.
  const stranger = render(ProofScreen, scene(proofScenes, 'proof-view-not-a-member'));
  assert.match(stranger, /You are not in this squad/);
  assert.match(stranger, /public view/);
  assert.doesNotMatch(render(ProofScreen, scene(proofScenes, 'proof-view')),
    /You are not in this squad/);

  // A member who opened their own proof link gets a chevron back to the squad.
  const fromSquad = render(ProofScreen, scene(proofScenes, 'proof-view-from-squad'));
  assert.match(fromSquad, /href="\/squads\/0f1d2c3b-4a59-4687-9b0c-1d2e3f405162"/);
});

test('an onward path may only ever be this app\'s own', () => {
  assert.equal(onwardPath('/squads/abc'), '/squads/abc');
  assert.equal(onwardPath('/squads/abc?x=1'), '/squads/abc?x=1');
  // A protocol-relative URL is the attack: a browser follows `//evil.example` off this origin.
  for (const hostile of ['//evil.example', 'https://evil.example', 'javascript:alert(1)',
    '\\\\evil.example', '/\\evil.example', 'squads', '', undefined, ['/a', '/b']]) {
    assert.equal(onwardPath(hostile as string | undefined), null, String(hostile));
  }
});

test('§10 every failure screen has words in all five languages', () => {
  for (const lang of LANGS) {
    const s = strings(lang).notice;
    for (const [key, value] of Object.entries(s)) {
      if (typeof value === 'function') {
        assert.ok(value('abc').includes('abc'), `${lang} ${key}`);
        continue;
      }
      assert.ok(value.length > 2, `${lang} ${key}`);
    }
    // Not left in English, except where the English happens to be the right word.
    if (lang !== 'en') {
      assert.notEqual(s.notFoundTitle, strings('en').notice.notFoundTitle, lang);
      assert.notEqual(s.errorBody, strings('en').notice.errorBody, lang);
    }
  }
});

test('no page ends at a failure the app does not explain', () => {
  // The boundaries exist at all: without them Next renders its own untranslated 404 and
  // "Application error: a server-side exception has occurred".
  for (const file of ['apps/web/app/not-found.tsx', 'apps/web/app/error.tsx',
    'apps/web/app/global-error.tsx']) {
    assert.match(readFileSync(file, 'utf8'), /NoticeScreen/, file);
  }
  // And no page redirects to a bare '/' any more: the reason travels with it.
  for (const page of ['apps/web/app/squads/page.tsx', 'apps/web/app/squads/new/page.tsx',
    'apps/web/app/squads/[id]/page.tsx', 'apps/web/app/squads/[id]/leaving/page.tsx',
    'apps/web/app/squads/[id]/pay/page.tsx']) {
    const source = readFileSync(page, 'utf8');
    assert.doesNotMatch(source, /redirect\('\/'\)/, page);
    assert.match(source, /signInFirstUrl/, page);
  }
});
