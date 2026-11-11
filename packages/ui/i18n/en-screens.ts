/**
 * English, screen by screen (PRD §9). Same shape rules as `en-core.ts`: an entry that takes
 * values is a function, so each language keeps its own word order.
 *
 * Headings arrive as two lines because the screens break them deliberately; a language whose
 * phrase breaks elsewhere moves the break by moving the words between the two entries.
 */
export const enScreens = {
  signIn: {
    headingLead: 'Save together. ',
    headingEmphasis: 'Nobody holds the pot.',
    intro: 'Every share stays in its owner’s wallet, staked and earning, proven on the Nimiq chain.',
    idle: 'Sign in to get started. Your signature proves it’s you.',
    waitingSignature: 'Waiting for your signature…',
    signedIn: 'You’re signed in.',
    goToSquads: 'Go to my squads',
    openInPay: 'Open in Nimiq Pay ↗',
    signIn: 'Sign in with Nimiq Pay',
    waitingApproval: 'Waiting for approval…',
    tryAgain: 'Try sign-in again',
    fineprint: 'Signing in doesn’t move any NIM.',
    exampleGoals: 'Example goals',
    /* What the app is, in three rows. The entry screen used to say only that nobody holds the
     * pot, which answers an objection nobody has heard yet; these answer "what is this?". */
    howTitle: 'How it works',
    how1Title: 'Pick a goal, together',
    how1Body: 'Name what you are saving for, set the day, and invite your friends with one link.',
    how2Title: 'Your NIM never leaves your wallet',
    how2Body: 'Each share is staked from its own owner’s wallet and earns there. Only your approval can move it.',
    how3Title: 'Progress is read from the chain',
    how3Body: 'Everyone sees who is covered and who is short, taken from Nimiq itself — never from a number we typed.',
    /** The banner on an invite link's sign-in screen; the squad's name comes from data. */
    invitedTo: (squad: string) => `Invited to ${squad} — sign in to join`,
  },

  privacy: {
    eyebrow: 'BEFORE YOU START',
    headingTop: 'Your NIM stays',
    headingBottom: 'in your wallet.',
    keepsTerm: 'What Squad Stake keeps',
    keepsBody: 'Your squads, what you committed, and the transaction hashes you approve.',
    neverTerm: 'What it never keeps',
    neverBody: 'Your keys, your seed, your balance. Every status is read from the Nimiq chain when you open a squad, never stored as truth.',
    seesTerm: 'What your squad sees',
    seesBody: 'Your commitment and whether it is backed or short — not your balance.',
    movesTerm: 'What moves money',
    movesBody: 'Only you, by approving a transaction in Nimiq Pay. Squad Stake cannot move your NIM, and nobody holds the pot.',
    accept: 'Got it',
    fineprint: 'Staking keeps your NIM yours. Leaving a stake takes up to a day.',
  },

  create: {
    squadEyebrow: (shortId: string) => `SQUAD ${shortId}`,
    readyHeadingTail: 'is ready.',
    readyIntro: 'Share this link. Friends sign in with Nimiq Pay and commit from their own wallet.',
    inviteHint: 'Anyone with the link can join, so share it only with your squad.',
    openSquad: 'Open the squad',
    eyebrow: 'NEW SQUAD',
    headingTop: 'What are you',
    headingBottom: 'saving for?',
    nameLabel: 'Squad name',
    namePlaceholder: 'Lisbon in April',
    modeLegend: 'Mode',
    modeADetail: 'One total. On goal day everyone pays the recipient.',
    modeBDetail: 'Own targets, shared date. Nobody pays anybody.',
    totalLabel: 'Total target (NIM)',
    recipientLabel: 'Recipient address',
    recipientHint: 'Fixed now and visible to everyone. Payments go straight here.',
    /* Spaces, no spaces and lower case are all accepted and normalised before this fires
     * (apps/web/src/core/nimiq-address.ts); this is for an address that is genuinely not one. */
    recipientInvalid: 'That recipient is not a Nimiq address.',
    recipientInvalidNext: 'Paste the address again — it starts with NQ and has 36 characters.',
    personalLabel: 'Your target (NIM)',
    personalHint: 'Everyone sets their own when they join.',
    goalDateLabel: 'Goal date',
    goalDateHint: 'At least three days away: leaving a stake takes up to a day.',
    creating: 'Creating…',
    submit: 'Create squad',
    fineprint: 'Creating a squad moves no NIM and needs no approval.',
  },

  commit: {
    introTogether: 'Own targets, shared date.',
    introShared: (total: string) => `${total} together.`,
    membersLine: (members: string) => `${members} · your NIM never leaves your wallet`,
    amountLabel: 'Your commitment (NIM)',
    amountYours: (amount: string) =>
      `You committed ${amount} before. Change it to whatever you want to save.`,
    amountShare: (amount: string) =>
      `Suggested ${amount}: an even share of the goal. Change it to anything you like.`,
    notStakingTitle: 'You are not staking yet',
    notStakingBody: (minimum: string) =>
      `Create a staker with at least ${minimum} to back your commitment. It stays yours and it earns.`,
    readyTitle: 'Ready to save',
    readyBody: (free: string) => `${free} of your savings is free to commit.`,
    needsStakeTitle: (shortfall: string) => `${shortfall} more stake needed`,
    needsCreateBody: (fee: string) => `Create a staker in Nimiq Pay (fee ${fee}), then commit.`,
    needsAddBody: (fee: string) => `Add to your stake in Nimiq Pay (fee ${fee}), then commit.`,
    pendingTitle: 'Waiting for the chain',
    pendingBody: (confirmations: number, required: number) =>
      `${confirmations} of ${required} confirmations. A hash is not success, so your commitment is saved once the chain confirms it.`,
    stalled: 'Still unconfirmed. Nothing was resent — check again when you like.',
    committedTitle: (amount: string) => `Committed ${amount}`,
    committedBody: (free: string) => `Covered by your own savings. ${free} still free.`,
    createStaker: 'Create staker in Nimiq Pay',
    addStake: 'Add stake in Nimiq Pay',
    commit: 'Commit',
    committed: 'Committed',
  },

  squad: {
    intro: (committed: string, members: string, goalDay: string) =>
      `${committed} committed by ${members}. ${goalDay}.`,
    leaveByTitle: (moment: string) => `Start leaving by ${moment}`,
    leaveByLeft: (remaining: string) => ` — ${remaining} left`,
    leaveByPassed: ' — that has passed',
    leaveByBody: 'Unstaking takes up to a day on the Nimiq chain, so a stake you want liquid on goal day has to start leaving before then. Nothing starts by itself.',
    leaveByShort: 'Unstaking takes about a day, so start before goal day.',
    leaveByInfoTitle: 'Why start early?',
    leaveByInfoBody: 'Nimiq releases staked NIM only after the reporting window that follows the next election block — about a day on this chain, and longer if your validator is jailed. Nothing starts by itself: your stake stays where it is until you tap Start leaving and approve it in Nimiq Pay. Starting the day before goal day leaves no room for that wait.',
    startLeaving: 'Start leaving',
    completeTitle: 'This squad is complete',
    completeBody: 'Every member who committed has paid, and each payment was checked on-chain.',
    recipientNote: (recipient: string) =>
      `On goal day, every share is paid to ${recipient}, the recipient fixed when the squad was created.`,
    inviteMissing: 'This squad was created before invite links could be shown again, so its link cannot be recovered. New members need a link from whoever created it.',
    inviteCopied: 'Invite link copied.',
    inviteHint: 'Anyone with this link can join, so share it only with your squad.',
    proofNote: 'Anyone can check this squad without signing in.',
    commitMine: 'Commit my share',
    changeCommitment: 'Change my commitment',
    shareInvite: 'Share invite',
    leaveSquad: 'Leave squad',
  },

  /**
   * Screens that exist only to explain a failure. Nothing in this app may fail silently: a
   * page that cannot be shown says what happened, what it means for the member's NIM, and
   * where to go next.
   */
  notice: {
    notFoundTitle: 'That page is not here.',
    notFoundBody: 'The link may be wrong or the squad may have been removed. Nothing has changed, and no NIM has moved.',
    errorTitle: 'Something went wrong on our side.',
    errorBody: 'This page could not be built. Your squad and your stake are untouched — nothing here can move NIM on its own.',
    errorReference: (digest: string) => `Reference ${digest}`,
    inviteInvalidTitle: 'That invite link is not valid.',
    inviteInvalidBody: 'It may be mistyped, or the squad may be closed. Ask whoever invited you for a fresh link.',
    signInFirstTitle: 'Sign in to open that page.',
    signInFirstBody: 'That page is a squad’s own, so it needs your wallet signature first. You will come straight back to it.',
    notAMemberTitle: 'You are not in this squad.',
    notAMemberBody: 'This is its public view: the same statuses, read from the chain, without the invite link.',
    home: 'Go to the start',
    mySquads: 'Go to my squads',
  },

  mySquads: {
    eyebrow: 'YOUR SQUADS',
    headingEmpty: 'Start a squad.',
    heading: 'Your squads.',
    introEmpty: 'A squad is a goal, a date and the people saving for it. Every share stays in its owner’s wallet.',
    cardMeta: (mode: string, members: string) => `${mode} · ${members}`,
    cardFigure: (committed: string, target: string | null) =>
      `${committed} committed${target === null ? '' : ` of ${target}`}`,
    cardYours: (amount: string) =>
      `Yours: ${amount} · statuses are read from the chain on the squad page`,
    createSquad: 'Create squad',
  },

  /**
   * A transaction in flight. `confirmingUnread` and `submitted` exist so a count nobody read
   * is worded instead of printed as a zero (packages/ui/pending.ts).
   */
  /**
   * PRD §7.4 by stage. Leaving, ready, withdrawn and paid all still count toward the squad's
   * progress; only `missing` is a share the chain says is not there (packages/ui/progress.ts).
   */
  stages: {
    saved: (amount: string) => `${amount} saved`,
    leaving: (amount: string) => `${amount} leaving`,
    ready: (amount: string) => `${amount} ready to withdraw`,
    withdrawn: (amount: string) => `${amount} withdrawn`,
    paid: (amount: string) => `${amount} paid`,
    missing: (amount: string) => `${amount} missing`,
    unread: (amount: string) => `${amount} not read`,
    readyIn: (duration: string) => `(ready in ~${duration})`,
    readyNow: '(ready now)',
  },

  /** The leave-by banner once leaving has started: where the member's stake is, never an
   * invitation to start again. */
  exit: {
    unlocksIn: (amount: string, duration: string) => `Your ${amount} unlocks in about ${duration}`,
    unlockNote: 'The chain decides when. Nothing to do until then.',
    unlockUnknown: (amount: string) => `Your ${amount} is on its way out`,
    unlockUnknownNote: 'The release time is not known yet.',
    readyTitle: (amount: string) => `Your ${amount} is ready to withdraw`,
    readyNote: 'Finish the steps to get it back in your wallet.',
    withdrawnTitle: (amount: string) => `Your ${amount} is back in your wallet`,
    paidTitle: (amount: string) => `Your ${amount} share is paid`,
    jailed: 'Your validator is jailed, so the release is later than usual.',
    viewProgress: 'View progress',
  },

  pending: {
    final: 'Confirmed on the chain',
    failed: 'That transaction failed',
    confirming: (confirmations: number, required: number) =>
      `On the chain · ${confirmations} of ${required} confirmations`,
    confirmingUnread: 'On the chain · confirming',
    submitted: 'Sent · waiting for the chain',
    submittedCount: (confirmations: number, required: number) =>
      `Sent · ${confirmations} of ${required} confirmations`,
    unknown: 'Checking the chain',
  },

  proof: {
    eyebrow: (shortId: string) => `PUBLIC PROOF · SQUAD ${shortId}`,
    modeAPhrase: 'A shared goal',
    modeBPhrase: 'Together goals',
    intro: (phrase: string, network: string, amounts: string, day: string) =>
      `${phrase} on Nimiq ${network}. ${amounts}, goal day ${day}.`,
    introAmounts: (committed: string, target: string | null) =>
      `${committed} committed${target === null ? '' : ` of ${target}`}`,
    backedLine: (amount: string) => `${amount} backed by active stake`,
    paidToLine: (paid: number, owing: number) => `${paid} of ${owing} paid to`,
    paymentsNote: (reference: string) =>
      `A payment counts when the recipient, an amount of at least the member’s share, the reference ${reference}, the execution result and finality all check out. The sender is deliberately not matched: Nimiq Pay pays from a cosigned HTLC, so the sending address is not the member’s own.`,
    checkTitle: 'Check it yourself',
    readTerm: 'Every status above is a chain read',
    readBody: (method: string, endpoint: string) =>
      `Each member’s status comes from ${method} on ${endpoint}, read when this page was loaded. Nothing on this page is stored as truth.`,
    repeatTerm: 'Repeat the read',
    jsonTerm: 'Or read this page as JSON',
    fineprint: 'Squad Stake never holds anyone’s NIM. Each share sits in its owner’s own wallet, staked with a validator of their own.',
  },

  leave: {
    eyebrow: 'LEAVE SQUAD',
    headingTop: 'Leave',
    headingBottom: (name: string) => `${name}?`,
    intro: (amount: string) =>
      `Your commitment of ${amount} is removed and the squad sees it straight away.`,
    stakeTerm: 'Your stake',
    stakeBody: 'Stays exactly as it is. Leaving sends no transaction and pays no fee.',
    unstakingTerm: 'Unstaking',
    unstakingBody: 'Separate, and up to you. Start it from your stake when you want your NIM liquid.',
    leaving: 'Leaving…',
    leave: 'Leave squad',
    stay: 'Stay',
  },

  leaving: {
    chipLocked: 'Not yet',
    chipAvailable: 'Your turn',
    chipWaiting: 'Waiting for the chain',
    chipPending: 'Sent',
    chipFailed: 'Failed',
    chipDone: 'Done',
    eyebrow: (shortId: string) => `LEAVING · SQUAD ${shortId}`,
    headingTop: 'Get your NIM',
    headingBottom: 'ready in time.',
    intro: (name: string, share: string) =>
      `Your share of ${name} is ${share}. Leaving a stake takes three separate approvals and a wait the chain decides. Nothing here starts by itself.`,
    leaveByTitle: (moment: string) => `Start leaving by ${moment}`,
    leaveByLeft: (remaining: string) => `${remaining} left.`,
    leaveByPassed: 'That deadline has passed — start now and it may still arrive in time.',
    goalDayIs: (moment: string) => `Goal day is ${moment}.`,
    noStake: 'No stake found for your address',
    stakeLine: (active: string, inactive: string, retired: string) =>
      `${active} active · ${inactive} unstaking · ${retired} ready to withdraw`,
    step1: 'Start leaving',
    amountLabel: 'NIM to free up',
    amountHint: (share: string, fee: string) => `Your share is ${share}. Fee ${fee}.`,
    shortfallTitle: (amount: string) => `This will show you short by ${amount}`,
    shortfallBody: 'Your squads all read the same one active balance, so taking NIM out of it changes what every squad sees.',
    shortfallAffected: ' These would say so:',
    affectedRow: (name: string, amount: string) => `${name} — ${amount} committed`,
    startButton: 'Start leaving in Nimiq Pay',
    step1Locked: 'You have no stake to leave. Commit and stake first.',
    step1Done: 'Your stake is on its way out. The chain decides when it is released.',
    step2: 'Confirm withdrawal',
    releaseUnknown: 'The release time is not known yet, so this stays switched off rather than guessing.',
    releaseAbout: (remaining: string) => `About ${remaining} to go.`,
    releaseDetail: (block: string, head: string | null, moment: string) =>
      `Released at block ${block}${head === null ? '' : `, chain is at ${head}`} — about ${moment}. The block number is the rule; the time is an estimate.`,
    releaseJailed: ' Your validator has been jailed, which pushes this later.',
    retireBody: (fee: string) =>
      `This is the irreversible one: retired stake no longer earns, and it can only go back to your wallet. Fee ${fee}.`,
    confirmTick: 'I understand this cannot be undone.',
    retireButton: 'Confirm withdrawal in Nimiq Pay',
    step2Locked: 'Nothing is unstaking yet.',
    step2Done: 'Confirmed. Your NIM is ready to withdraw.',
    step3: 'Withdraw',
    withdrawBody: (amount: string) =>
      `${amount} goes back to your wallet. It has to be the whole amount, and the fee comes out of it, so there is nothing to choose here.`,
    withdrawButton: 'Withdraw in Nimiq Pay',
    step3Locked: 'Confirm the withdrawal first.',
    step3Done: 'Your NIM is back in your own wallet.',
    step4: 'Pay my share',
    payBody: (amount: string) =>
      `${amount} to the recipient fixed when the squad was created. The squad sees it once the chain confirms it.`,
    payDone: 'Your share is paid and verified on-chain.',
    payLocked: 'Finish withdrawing first, then pay your share.',
    fineprint: 'Squad Stake cannot move your NIM. Each step waits for your approval in Nimiq Pay.',
  },

  pay: {
    eyebrow: (shortId: string) => `PAY MY SHARE · SQUAD ${shortId}`,
    headingTail: 'to the recipient.',
    intro: (name: string, moment: string) =>
      `${name} is a shared goal, so on goal day every share goes to the one address the squad agreed on. Goal day is ${moment}.`,
    recipientTerm: 'Recipient',
    referenceTerm: 'Reference on-chain',
    rosterTerm: 'Squad so far',
    readyTitle: 'Ready to pay',
    readyBody: 'Nimiq Pay will ask you to approve exactly this amount to exactly this address.',
    withdrawFirstTitle: 'Withdraw first',
    withdrawFirstBody: 'Your share is still in the staking contract. Finish the leaving steps, then pay from your own wallet.',
    checkingTitle: 'Checking the chain',
    checkingBody: 'Reading the transaction back to confirm the recipient, the amount and the reference.',
    refusedNote: 'The NIM did leave your wallet — this transaction simply does not settle your share, so the squad does not count it.',
    paidTitle: 'Paid and verified',
    paidBody: 'Checked on-chain: the recipient, at least your share, the squad reference, the execution result and finality.',
    paidAll: ' Everyone has paid, so this squad is complete.',
    paidSome: ' The squad page shows it to everyone.',
    payButton: 'Pay my share in Nimiq Pay',
    paidButton: 'Paid',
    fineprint: 'Squad Stake never holds this money. It goes straight from your wallet to the recipient.',
  },

  tx: {
    pendingTitle: 'Waiting for the chain',
    failedTitle: 'That transaction failed',
    doneTitle: 'Confirmed on-chain',
    unknownTitle: 'Outcome not known yet',
    confirmations: (confirmations: number, required: number) =>
      `${confirmations} of ${required} confirmations. Nothing counts as done until the chain has finalised it.`,
    /** No count has been read. Never printed as the digit 0: that is the sentence
      * "0 of 60 confirmations" that contradicted the chain on a real phone. */
    confirmationsUnread: 'The confirmation count has not been read yet. Nothing counts as done until the chain has finalised it.',
    failedBody: 'It was included in a block but did not execute. Nothing moved; the fee was spent.',
    unknownBody: 'The chain could not be read for this transaction. It may still be fine — nothing has been resent.',
    stalled: 'Still no verdict yet. Nothing was resent; check again whenever you like.',
    lookUp: 'Look it up yourself',
    sceneEyebrow: 'TRANSACTION',
    sceneHeadingTop: 'A hash is not',
    sceneHeadingBottom: 'success.',
    sceneIntro: 'Every transaction Squad Stake starts is followed until the chain says what happened to it, and the hash is always shown so anyone can look it up.',
  },

  memberStatus: {
    waitingRead: 'Waiting for a chain read.',
    backed: 'Your savings cover your commitments.',
    shortMasked: 'This stake is below the commitment. The squad sees short, not the balance.',
    shortYours: 'Your savings are below your total commitments.',
    releaseUnknown: 'Release estimate: —',
    waitingBlock: (block: string) => `Waiting for block ${block}.`,
    waitingConfirmation: 'Waiting for chain confirmation.',
    untilRelease: (hours: number, minutes: number) => `About ${hours} h ${minutes} min until release.`,
    releasable: 'The wait is over. You can confirm retirement.',
    retired: 'Your retired stake can now return to your wallet.',
    notStaking: 'No staker record was found for your address.',
    left: 'This member left the squad. Their commitment was removed.',
    approximate: 'Timing is approximate. The chain confirms release.',
    sceneEyebrow: 'ON-CHAIN STATUS',
    sceneHeading: 'Your stake.',
  },

  orbit: {
    wordSaved: 'saved',
    wordBacked: 'backed',
    wordCommitted: 'committed',
    total: (word: string) => `NIM ${word}`,
    totalOfTarget: (word: string, target: string) => `${word} of ${target} NIM`,
    sceneEyebrow: 'ORBIT',
  },
};
