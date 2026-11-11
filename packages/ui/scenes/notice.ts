import type { NoticeScreenProps } from '../NoticeScreen';
import { strings } from '../i18n';

const s = strings('en').notice;

/**
 * The screens a page shows when it cannot show itself (`app/not-found.tsx`, `app/error.tsx`,
 * `app/global-error.tsx`, and an invite token that resolves to nothing).
 *
 * They are fixtures like every other screen, so the words, the way on and the retry control
 * are measured at 390, 375 and 320 px in both themes rather than being discovered by someone
 * who has just hit a failure.
 */
export const noticeScenes: readonly { id: string; props: NoticeScreenProps }[] = [
  { id: 'notice-not-found', props: {
    title: s.notFoundTitle, body: s.notFoundBody, action: { label: s.home, href: '/' } } },
  // A server fault carries Next's own digest, which is the only name a member can give it.
  { id: 'notice-server-error', props: {
    title: s.errorTitle, body: s.errorBody,
    reference: s.errorReference('1f4c9ab27de30516'),
    action: { label: s.home, href: '/' }, onRetry: () => {} } },
  { id: 'notice-error-retrying', props: {
    title: s.errorTitle, body: s.errorBody,
    reference: s.errorReference('1f4c9ab27de30516'),
    action: { label: s.home, href: '/' }, onRetry: () => {}, retrying: true, t: 0.4 } },
  { id: 'notice-invite-invalid', props: {
    title: s.inviteInvalidTitle, body: s.inviteInvalidBody,
    action: { label: s.home, href: '/' } } },
];
