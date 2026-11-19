# Gamification

Gamification is available across all six presets. It uses the local PostgreSQL database and trusted Nest actions. Enable it with `pnpm forge add gamification` or set `features.gamification: true` in `forge.config.ts`. Run `pnpm db:migrate` before starting an updated checkout, and rebuild or restart the apps after changing the config.

## Rules and levels

Defaults are configurable. For example, this section changes the three level thresholds and turns off the listing reward.

```ts
features: { gamification: true },
gamification: {
  levelThresholds: [0, 50, 150],
  rules: {
    emailVerified: { points: 25, xp: 50, dailyLimit: 1 },
    listingPublished: null,
  },
},
```

| Event               | Source key             | Default points | Default XP | Daily awards per account |
| ------------------- | ---------------------- | -------------: | ---------: | -----------------------: |
| `EMAIL_VERIFIED`    | Account UUID           |             25 |         50 |                        1 |
| `LISTING_PUBLISHED` | Listing UUID           |             10 |         20 |                        3 |
| `POST_PUBLISHED`    | Community post UUID    |              5 |         10 |                        3 |
| `LESSON_COMPLETED`  | Lesson completion UUID |             10 |         20 |                       10 |

Level 1 begins at zero XP, and default thresholds are `[0, 50, 150, 350]`. Thresholds must ascend strictly. A rule issues nonnegative whole-number points and XP and must grant at least one positive amount. Set a rule to `null` to disable future awards for that event. Earned amounts remain unchanged when rules change, and the current thresholds determine displayed levels.

Email verification uses the private local mock outbox. Marketplace publication requires the Marketplace module. These rules apply as the business events occur. Existing verification or listings are outside the award path.

## Ledger and transaction boundaries

Email verification or listing publication emits a server-owned event inside its business transaction. The ledger checks the account and persisted source before granting. The event type and source ID form a unique key, so a replay preserves the existing outcome. Points and XP are chosen from server config.

Transactions take a PostgreSQL account-row lock before reading the cap and run at Read Committed isolation. The limit uses the calendar day in Forge's configured timezone. An eligible event beyond the cap is recorded as `CAPPED` with zero points and zero XP. Its key remains consumed after the day rolls over. Totals and the latest 20 entries are read from a single snapshot.

Authenticated users can open **پیشرفت من** from their account page or read `GET /api/v1/gamification/me`. The endpoint returns their totals, level thresholds and recent ledger entries. The session selects the account, and the response is marked `no-store`. There is no public event submission endpoint.

To add a source such as lesson completion, persist the qualifying action and use its stable record ID. Add an explicit event and configurable rule. Test ownership, rollback, caps and concurrent delivery. For callers that insert a new source row referencing the account, take the account lock before the insert.

## Administrator adjustments

In `/admin`, select **تغییر امتیاز** for an active member. Enter a signed whole number from −1000 to 1000, excluding zero, and an audit reason of up to 240 characters. The API accepts a UUID v4 request ID and returns 204 for both the first success and an exact replay by the same administrator. Reusing that ID with a different actor, account, amount, or reason returns 409. A deduction that would take the account below zero also returns 409.

The same account lock serializes earnings and adjustments. Each adjustment stores its actor, request ID, reason, amount and timestamp together in the ledger. Audit reasons are available to trusted database operators. Member history displays the point change. XP, badges, and streaks depend on qualifying business awards.

## Achievements, streaks and rankings

The progress screen shows two configurable badges. `gamification.achievements.awardCount` defaults to one business award, and `xpMilestone` defaults to 100 XP. Set either threshold to `null` to hide that badge. Progress derives from the ledger using current thresholds.

A qualifying awarded event marks that local day active. Daily streaks use consecutive local days. Weekly streaks use Saturday through Friday. A current streak can include yesterday or the prior week while its current period is open. The page shows current and longest runs plus the most recent 14 days.

Ranking participation is off until a member opts in on their progress screen. Authenticated viewers can see opted-in, active participants who earned XP in the selected period. Rows expose display name, XP and rank. Equal XP shares a rank, and stable sorting breaks display-order ties. The periods are local day, Saturday-based week, Jalali month and all-time. Opt-out and suspension remove a member from subsequent reads. Administrator adjustments affect points only.

## Quests

Forge supports one configured quest at a time, with a one-time, daily or weekly schedule. Set `quest: null` to hide the widget and stop progress. Existing progress records and earned rewards are retained.

### Time-limited quest

Set `gamification.quest` in `forge.config.ts` to show one campaign on the signed-in **پیشرفت من** page. The default is `null`. For example, a Marketplace preset can reward two eligible listing publications during a campaign.

```ts
features: { gamification: true },
gamification: {
  quest: {
    key: 'first-listings-2026',
    title: 'انتشار دو آگهی',
    event: 'LISTING_PUBLISHED',
    target: 2,
    startsAt: '2026-11-01T00:00:00Z',
    endsAt: '2026-12-01T00:00:00Z',
    reward: { points: 50, xp: 25 },
  },
},
```

The UTC window includes the start instant and excludes the end instant. Omit the cadence or set `cadence: 'once'`. The widget displays Jalali dates and local times in the configured timezone. `EMAIL_VERIFIED` is available across presets with a target of one. Listing, post, and lesson events require their corresponding feature and accept targets from one to 100. The selected event's earning rule must also be enabled. Completed quests retain their completed status after the window ends.

### Daily quest

Set `cadence: 'daily'` and omit the UTC window. A recurring quest uses a listing, post, or lesson event from an enabled feature. The daily target must fit within the configured daily earning cap.

```ts
features: { gamification: true },
gamification: {
  quest: {
    key: 'daily-listings',
    title: 'آگهی‌های امروز',
    cadence: 'daily',
    event: 'LISTING_PUBLISHED',
    target: 2,
    reward: { points: 50, xp: 25 },
  },
},
```

The same local calendar date determines both the earning cap and the quest occurrence. Progress starts at zero on each new local day, and the completed occurrence and reward stay in PostgreSQL. The widget displays the current date in the Jalali calendar and indicates the daily reset. Set the root `timezone` to control the reset. Use a new quest key for a new campaign when changing the cadence, event, threshold, reward or window.

### Awards and progress

Each newly awarded event of the configured kind advances the quest by one. Daily earning limits still apply. Events recorded before the quest was configured, capped events, replays, adjustments and reward entries leave progress unchanged. The qualifying business action, ledger award, quest progress and completion reward commit together under the account lock. Completion creates one `QUEST_COMPLETED` ledger row with the progress record's ID as the source. The reward contributes to points, XP, levels and opted-in rankings. Business awards determine the activity badge count and streaks.

The private progress endpoint reports the selected occurrence and its status. The daily quest can grant one reward per account per local day. Its completed occurrences keep separate progress IDs and ledger source IDs. The migration preserves existing one-time progress IDs and reward source IDs.

## Ordered mission

Set `gamification.mission` to configure one ordered mission alongside any one-time or daily quest. The default is `null`. The Marketplace example uses email verification first, followed by two listing steps.

```ts
features: { gamification: true },
gamification: {
  mission: {
    key: 'seller-onboarding',
    title: 'آغاز فروش',
    steps: [
      { event: 'EMAIL_VERIFIED', target: 1 },
      { event: 'LISTING_PUBLISHED', target: 2 },
      { event: 'LISTING_PUBLISHED', target: 1 },
    ],
    reward: { points: 75, xp: 40 },
  },
},
```

The first step is active when the mission is configured. Each eligible award advances the active step by one. Completing a step unlocks the next, which starts at zero. Even consecutive steps of the same event require separate sources. An early or capped event stays consumed in the business ledger. Progress can span multiple local days, and the daily earning limits still apply.

Missions accept two to ten steps, with targets from one to 100. Email verification is a one-time source and can only be the first step with a target of one. Previously recorded awards are outside mission progress. Use listing-only steps for accounts that have already earned their verification award. Each source's earning rule must be enabled, and listing steps require Marketplace.

The Persian progress page shows completed, active and locked steps. A qualifying action can advance both a quest and a mission. The qualifying action, progress and completion rewards commit together under the account lock. Completing the final mission step grants one `MISSION_COMPLETED` ledger entry per account and mission key. Its source ID is the mission progress record. The reward contributes to points, XP, levels and opted-in rankings.

Choose a new mission key when changing its steps or reward. Set `mission: null` to hide the mission widget and pause progress. Saved progress and rewards remain available when the same mission is restored.

## Reward catalog and redemption

Set `gamification.rewards` in `forge.config.ts` to list up to 20 local rewards. Each item has a unique key, a title, a description, and an integer point cost from 1 to 1,000,000. The catalog defaults to empty.

```ts
features: { gamification: true },
gamification: {
  rewards: [
    {
      key: 'practice-receipt',
      title: 'رسید تمرینی',
      description: 'یک رسید محلی در تاریخچهٔ پاداش‌ها ثبت می‌شود.',
      cost: 20,
    },
  ],
},
```

Open **پاداش‌ها** from the progress screen to see the available balance, catalog, and latest 20 receipts. Redemption uses the current server-side price. It records a local receipt and a negative `REWARD_REDEEMED` ledger entry in the same transaction. The account lock serializes spending alongside earnings and administrator adjustments. XP, badges, and streaks are unaffected by spending.

Each account can retry a UUID v4 request ID to recover the original receipt for the same reward key. The receipt stores the original title and cost and remains available after a catalog change. Reusing that request ID with another key or trying to spend more than the available balance returns 409. The browser reuses the request ID after a failed response while the catalog view is open.

Fulfillment is a local database receipt. The catalog uses mock items and the redemption stays inside Forge. [Local fulfillment](MOCKS.md#reward-fulfillment)

## Advanced gamification

### Challenges, seasons, and referrals

A preset can configure one challenge and one season at a time.

```ts
challenge: {
  key: 'winter-launch', title: 'چالش آغاز',
  mode: 'group', event: 'LISTING_PUBLISHED', target: 10,
  startsAt: '2026-12-01T00:00:00Z', endsAt: '2027-01-01T00:00:00Z',
  reward: { points: 50, xp: 30 },
},
season: {
  title: 'فصل زمستان',
  startsAt: '2026-12-01T00:00:00Z', endsAt: '2027-01-01T00:00:00Z',
},
referralReward: { points: 10, xp: 5 },
```

Members join while the challenge window is open. Only newly awarded events after enrollment and before the exclusive end count. Individual mode tracks each member's target. Group mode tracks one shared target and stops accepting contributions once it is met. Each eligible contributor claims one ledger reward, including after the window ends while the challenge remains configured. Finish claims before replacing the challenge key. Challenge ranking and seasonal XP ranking use the existing ranking consent and moderation rules.

A verified account can share its invite code. An unverified account can set one inviter before verifying its own email. Verification qualifies the referral, and the inviter claims its reward once. The local mail outbox supports the whole workflow. Users can also set a private goal for qualifying activities, and their progress screen shows the recent activity ledger and a level-up message when the latest XP award crossed a threshold.

### Recurrence, badges, and progression perks

Daily quests repeat by local date. Set `cadence: 'weekly'` to start a new occurrence each Saturday in the configured timezone. An ordered mission can set `requiresQuest` to the active one-time quest's key. Mission progress starts with the next eligible event after completion of that prerequisite.

Use `badges` for up to 20 additional achievement definitions with `key`, `title`, `category` (`activity` or `xp`), `rarity` (`common`, `rare`, or `epic`), and `target`. A badge can set `requires` to an earlier badge's key. Keep prerequisites before dependent badges. The progress page displays count, category, rarity, and unlock status.

Set `levelBenefits` to entries such as `[{ level: 2, percent: 20 }]`. The best eligible discount applies to the current catalog price, rounded up to whole points. A receipt keeps the actual charged price. Configure `streakEvents` to select which awarded activities mark a day. Set `streakProtectionCost` to enable spending points to protect today or recover yesterday. The prior day must have qualifying activity or protection. A week allows one protection, and repeating the same protected day returns the original result. Protections extend the streak without adding activity XP.

### Administration and analytics

Open **مدیریت بازی‌سازی** from the admin page. Administrators can override a configured event's daily cap, override a catalog price, or set a price to zero to pause redemption. A zero cap records future sources as capped. Moderators can exclude or restore an account's ranking eligibility while preserving the account's consent preference. The report shows participation, challenge entries, verified referrals, redemptions, and accounts with the most capped events. The audit records the change, actor and time.
