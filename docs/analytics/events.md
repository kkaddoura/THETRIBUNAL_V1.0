# Analytics Events — Reference & Test Plan

Source of truth for every analytics event fired from the platform. Use this doc when:

- Adding a new event (extend the matrix below)
- Verifying a change didn't break tracking (run the test plan)
- Onboarding someone to the analytics setup
- Debugging "why didn't event X fire?"

Two destinations:

- **PostHog** — events, funnels, retention, cohorts. Two separate projects (one for the public platform, one for the CMS) so admin actions don't pollute user funnels.
- **Microsoft Clarity** — session replay + heatmaps. Consent-gated.

Both are initialized via `artifacts/tmh-platform/src/lib/analytics.ts` (public site) and `artifacts/cms/src/lib/analytics.ts` (CMS).

---

## Event matrix

| # | Event | Properties | Triggered when… | Where it fires |
|---|---|---|---|---|
| 1 | `session_started` | `isLoggedIn`, `isReturning` | First page load of a session (sessionStorage flag) | `hooks/use-analytics.ts` |
| 2 | `$pageview` | `path` | Every wouter route change | `hooks/use-analytics.ts` |
| 3 | `utm_landed` | `source`, `medium`, `campaign`, `content` | URL has `?utm_source=…` on first load of the session | `hooks/use-analytics.ts` |
| 4 | `poll_viewed` | `pollId`, `category`, `source`, `isLoggedIn` | Visit to `/debates/:id` | `pages/poll-detail.tsx` |
| 5 | `prediction_viewed` | `predictionId`, `category`, `isLoggedIn` | Visit to `/predictions/:id` | `pages/prediction-detail.tsx` |
| 6 | `voice_profile_viewed` | `profileId`, `source` | Visit to `/voices/:id` | `pages/profile-detail.tsx` |
| 7 | `pulse_topic_viewed` | `topicId`, `category` | User expands a pulse topic on `/pulse` | `pages/mena-pulse.tsx` |
| 8 | `vote_recorded` | `pollId`, `optionId`, `category`, `isLoggedIn`, `userId`, `userTotalVotes`, `isChange` | Every poll vote (new or changed) | `hooks/use-voter.ts` |
| 9 | `first_vote_ever` | `fromCountry` | User's first-ever vote, once per voter token | `hooks/use-voter.ts` |
| 10 | `streak_extended` | `newStreak`, `days` | Vote on a new day extends the streak | `hooks/use-voter.ts` |
| 11 | `share_clicked` | `contentType`, `contentId`, `channel`, `isLoggedIn`, `userId` | Click any platform button in the share modal | `components/ShareModal.tsx` |
| 12 | `login_prompt_shown` | `trigger`, `voteCount` | LoginPromptBanner becomes visible (3+ votes, not snoozed, not logged in) | `components/auth/LoginPromptBanner.tsx` |
| 13 | `login_prompt_clicked` | `action: "signup" \| "login" \| "dismiss"` | Any click on the banner | same |
| 14 | `signup_started` | — | User lands on `/signup` | `pages/signup.tsx` |
| 15 | `signup_field_completed` | `field: "username" \| "email" \| "password"` | User blurs a non-empty form field | same |
| 16 | `signup_submitted` | — | Form submit handler runs | `hooks/use-auth.ts` |
| 17 | `signup_succeeded` | `source: "web"` | Server returns 201 | same |
| 18 | `signup_failed` | `reason`, `sub` | Server returns 4xx | same |
| 19 | `login_succeeded` | — | Login mutation resolves | same |
| 20 | `login_failed` | `reason` | Login mutation rejects | same |
| 21 | `email_verification_sent` | `source: "signup" \| "resend"` | Right after signup OR account-page resend success | `use-auth.ts` + `pages/account.tsx` |
| 22 | `email_verification_completed` | `hoursSinceSignup` | User clicks email link, server returns ok | `pages/verify-email.tsx` |
| 23 | `newsletter_subscribed` | `source: "signup" \| "home_cta" \| "join_page" \| "share_modal" \| "prediction_gate"`, `optedIn` | Any of the 5 subscription paths | multiple |
| 24 | `cms_press_kit_generated` | `contentType`, `contentId`, `templates` | CMS founder clicks Generate kit | `cms/pages/press-kit.tsx` |
| 25 | `cms_digest_pushed` | `weekStarting`, `polls`, `predictions` | CMS founder clicks Push to Beehiiv | `cms/pages/newsletter-digest.tsx` |
| 26 | `cms_admin_logged_in` | `username` | Admin successfully signs in to CMS | `cms/lib/auth.tsx` |
| 27 | `cms_admin_logged_out` | `username` | Admin clicks logout in CMS | `cms/lib/auth.tsx` |

### Intentionally deferred

- **`newsletter_unsubscribed`** — needs a Beehiiv webhook → server endpoint → posthog-node integration. Add when Beehiiv is live with webhook support enabled.
- **`vote_changed`** — folded into `vote_recorded` via the `isChange: true` flag rather than a separate event.

---

## Privacy guarantees encoded in the wrapper

The `track()` helper in `lib/analytics.ts` enforces:

- **Email is never sent to PostHog.** The `identify()` wrapper strips `email` and `password` from any traits payload before forwarding.
- **`identify()` only after login.** Anonymous events stay anonymous; logged-in events get a stable `user:{id}` distinct ID.
- **Consent-gated.** PostHog initializes with `opt_out_capturing_by_default: true`. If the `IpConsentBanner` feature toggle is ON in CMS settings AND the user hasn't accepted, capture is paused. Clarity is consent-gated identically (script never loads without consent).

If `VITE_POSTHOG_KEY` is unset, the analytics module no-ops silently — useful for dev/staging without keys.

---

## Test plan

### Browser-side prereqs

1. Open the site in a **private window** (no localStorage carryover).
2. **Disable the `ipConsent` feature toggle** in CMS site settings, OR accept the consent banner. Otherwise capture stays opted-out and **no events fire**.
3. Open DevTools → Network → filter `i.posthog.com`. You should see `POST /e/?compression=…` requests after each action.

### Action → expected events

| To trigger… | Do this |
|---|---|
| `session_started`, `$pageview` | Open any page in a private window. |
| `utm_landed` | Visit `/?utm_source=test&utm_medium=manual&utm_campaign=qa`. |
| `poll_viewed` | Open any `/debates/:id`. |
| `prediction_viewed` | Open any `/predictions/:id`. |
| `voice_profile_viewed` | Open any `/voices/:id`. |
| `pulse_topic_viewed` | Go to `/pulse`, click a topic card to expand. |
| `vote_recorded`, `first_vote_ever` | Cast your first vote. `first_vote_ever` fires only once per device. |
| `streak_extended` | Vote today, vote again tomorrow. (Hard to test same-day.) |
| `share_clicked` | Open a poll → click Share → click any platform button. |
| `login_prompt_shown` / `_clicked` | Vote 3 times anonymously (clear `tmh_login_prompt_dismissed_at` first). Banner appears. Click Sign up / Sign in / X. |
| Full `signup_*` funnel | Visit `/signup` (`signup_started`). Tab through fields with content (`signup_field_completed` × N). Submit (`signup_submitted`). Server returns success (`signup_succeeded`) or 4xx (`signup_failed`). |
| `login_*` funnel | `/login` with correct creds → `login_succeeded`. Wrong password → `login_failed`. |
| `email_verification_sent` / `_completed` | Sign up → `_sent`. Click verify link in email → `_completed` on `/verify`. |
| `newsletter_subscribed` (5 sources) | Each path: signup form (auto-enrol = `signup`), home hero CTA = `home_cta`, `/join` lower form = `join_page`, share-modal email gate = `share_modal`, prediction gate on home = `prediction_gate`. |
| `cms_press_kit_generated` | CMS → Press Kit → enter content ID → Generate kit. |
| `cms_digest_pushed` | CMS → Weekly Digest → Push to Beehiiv now. |

### Verification matrix in PostHog

After running the test plan, all 25 events should be visible in **PostHog → Activity → Live events** within ~30 seconds of each action. After 5+ minutes, build:

- **Insights → Trends → Event count by name** → confirms cardinality of every event over time.
- **Insights → Funnels** → build the anonymous → signup funnel below to confirm the chain works.

---

## Known sub-flows worth instrumenting in PostHog

### Anonymous → Signup funnel

```
session_started
  → vote_recorded (any)
  → login_prompt_shown
  → login_prompt_clicked (action = "signup")
  → signup_succeeded
```

Tells you where anonymous voters drop off. The `login_prompt_clicked` step is the highest-leverage one to optimise.

### Content engagement leaderboard

```
Trends → vote_recorded
  break down by `pollId`
  top 20
  last 7 days
```

Use weekly to inform editorial selection.

### Newsletter source attribution

```
Trends → newsletter_subscribed
  break down by `source`
  all time
```

Tells you which entry path is converting best.

### First-vote-to-share retention

```
Funnel:
  first_vote_ever
  → share_clicked (within 7 days)
```

Validates the "share gate is working" hypothesis.

---

## PostHog setup — first-time

### 1. Create the projects

1. **https://us.posthog.com/signup** (or `eu.posthog.com` for EU hosting; switch the `host` env var accordingly).
2. Create the org (e.g. "The Tribunal").
3. Create **two projects** in the org:
   - `tribunal-platform` — public-site analytics (high volume)
   - `tribunal-cms` — CMS admin actions only

Each project gives you a different `phc_…` key.

### 2. Configure Railway env vars

Railway → service → Variables:

```
VITE_POSTHOG_KEY=phc_<platform-project-key>
VITE_POSTHOG_HOST=https://us.i.posthog.com    # or eu.i.posthog.com
VITE_CLARITY_PROJECT_ID=<from-clarity-dashboard>
VITE_CMS_POSTHOG_KEY=phc_<cms-project-key>
VITE_CMS_POSTHOG_HOST=https://us.i.posthog.com
```

These are public (baked into the bundle). PostHog project keys are write-only — they cannot read data, so embedding them client-side is safe by design.

### 3. Microsoft Clarity (recommended, optional)

1. **https://clarity.microsoft.com** — free, sign up.
2. Create a project, paste your domain, copy the Project ID.
3. Set `VITE_CLARITY_PROJECT_ID` in Railway.

Clarity will start recording sessions ~10 min after the first event. Replays are useful for "why did this user bounce here?" once PostHog flags a high drop-off.

### 4. Verify the pipe

After the redeploy:

1. Private window → site → DevTools → Network filtered by `i.posthog.com`.
2. Click anything that should fire an event (e.g. open a poll detail page).
3. Confirm `POST /e/` request goes out and returns 200.
4. PostHog → **Activity → Live events** → event appears within 30s.

### 5. Identification check

Sign up via the test plan. After signup completes:

1. PostHog → **Persons** → find your username.
2. Their event timeline should include events from **before** signup as well as after — that's PostHog merging the anonymous distinct ID with `user:{id}` via the `identify()` call in `useMe`.

If pre-signup events are *not* attached to the user, the identify chain is broken — likely a stale anonymous ID conflict. Reset by clearing the `tmh_voter_token` localStorage entry and trying again.

---

## Operational rules

1. **Adding a new event:** write to `track()` in code, add a row to the matrix above, add a test step in the table.
2. **Renaming an event:** PostHog treats it as two different events. Either (a) keep the old name, or (b) accept the historical break and document the rename here with the date.
3. **Removing PII:** the `identify()` wrapper already strips `email` and `password`. If you add a new identifier-like trait, add it to the strip list in `lib/analytics.ts`.
4. **Cardinality:** `pollId`, `predictionId`, `profileId`, `topicId`, `userId` are high-cardinality. PostHog handles this fine for trends; just don't accidentally use them as breakdown keys in funnel definitions (PostHog will refuse).
5. **Consent flips:** the `tmh:ip-consent-changed` custom event re-syncs `setConsent()` so capture toggles same-tab; cross-tab uses the `storage` event. If you ever change the consent gate, both listeners must be updated.

---

## Phase 2 — Pending events

Gaps surfaced during the 2026-05-08 audit. Not yet wired. Add to the matrix above when implemented and remove from this list.

### High-priority (auth & engagement holes)

| Event | Properties | Triggered when… | Where to fire |
|---|---|---|---|
| `password_reset_requested` | `emailKnown: boolean` (always `true` to caller, but server can drop) | User submits `/forgot-password` form | `pages/forgot-password.tsx` |
| `password_reset_completed` | `hoursSinceRequested: number` | Server returns 200 from `/api/auth/reset-password` | `pages/reset-password.tsx` |
| `logout_clicked` | `source: "user_menu" \| "account_page"` | Before `useLogout()` fires (so it captures BEFORE `resetAnalytics()` clears the distinct ID) | `components/auth/UserMenu.tsx`, `pages/account.tsx` |
| `vote_failed` | `pollId`, `optionId`, `reason` | Server returns 4xx/5xx on `/api/votes` | `hooks/use-voter.ts` |
| `share_failed` | `contentType`, `contentId`, `channel`, `reason` | Native share dismissed or platform handler errors | `components/ShareModal.tsx` |
| `streak_broken` | `previousStreak`, `daysGap` | Detected client-side or via cron `streakCheck` job (server-side via posthog-node) | `jobs/streakCheck.ts` |
| `feed_scrolled` | `page: "home" \| "debates" \| "predictions" \| "pulse"`, `depth: number` (cards in view) | Throttled (1/sec) intersection observer on listing cards | `pages/home.tsx`, `pages/polls.tsx`, `pages/predictions.tsx`, `pages/mena-pulse.tsx` |
| `infinite_scroll_loaded` | `page`, `pageNumber: number` | Each pagination fetch resolves | wherever infinite scroll is wired |
| `category_filter_used` | `page`, `category: string`, `previousCategory?: string` | User clicks a category in the shared `FilterSidebar` | `components/layout/FilterSidebar.tsx` |
| `chatbot_message_sent` | `messageLength: number`, `topicGuess?: string` | User submits a Noor chatbot message | wherever the Noor chat input is |
| `apply_voice_started` | — | User opens `/apply` | `pages/apply.tsx` (or equivalent) |
| `apply_voice_completed` | `country: string`, `companyUrl?: string` | Server returns 201 from apply endpoint | same |
| `prediction_resolved` | `predictionId`, `verdict: "yes" \| "no" \| "void"`, `resolvedBy: "auto" \| "manual"` | CMS or auto-resolution finalizes a prediction | `routes/cms-resolutions.ts` (server-side via posthog-node) |
| `majlis_invite_accepted` | `inviteSource?: string` | Invite token redeemed | majlis registration flow |
| `majlis_message_sent` | `roomId`, `length: number` | New Majlis message submit | majlis chat component |

### Medium-priority

| Event | Properties | Triggered when… | Where to fire |
|---|---|---|---|
| `account_avatar_changed` | `previousAvatarId`, `newAvatarId` | PATCH `/api/auth/me` succeeds with avatarId change | `pages/account.tsx` |
| `account_newsletter_toggled` | `optedIn: boolean` | PATCH `/api/auth/me` succeeds with newsletterOptIn change | `pages/account.tsx` |
| `email_link_clicked` | `linkType: "verification" \| "reset" \| "newsletter"`, `campaign?: string` | Server-side via Resend webhook (requires posthog-node + webhook handler) | new `routes/email-webhook.ts` |
| `form_error` | `form: "signup" \| "login" \| "reset" \| "apply"`, `field?: string`, `code: string` | Whenever a client-side or server-validation error is shown to the user | shared error display path |

### Identify-chain enrichments

The `identify()` call in `useMe()` currently sends only `username`. Extend with:

- `signupSource` — captured at signup time (`web` for now, `mobile_safari_pwa` later, etc.)
- `firstSeenCountry` — derived once at first vote
- `emailVerifiedAt` — ISO timestamp; lets you cohort on verification status
- `totalVotes` — kept in sync as a person-property via `posthog.people.set({ totalVotes })` after each vote

These become PostHog person-properties — usable as filters across every event without per-event redundancy.

### Notes on instrumentation discipline

- **Server-side events** (`prediction_resolved`, `streak_broken`, `email_link_clicked`) need `posthog-node` installed in `artifacts/api-server`. Do not attempt to fire these from the browser — they're decoupled from a logged-in session.
- **Cardinality risk**: `feed_scrolled` and `infinite_scroll_loaded` can blow up event volume. Throttle (1 event/sec/user) and consider sampling at 10% in production.
- **Phase 2 ships in tranches**: don't wire all 19 events at once. Recommend tranches: (a) auth holes — password reset + logout, (b) failure events — vote/share fails, (c) engagement — feed/filter/chatbot, (d) server-side via posthog-node.

---

## Last verified

- **2026-05-05** — All 25 events wired and shipping clean (`pnpm run typecheck` = 0 errors).
- All 5 newsletter subscription paths (`signup`, `home_cta`, `join_page`, `share_modal`, `prediction_gate`) fire `newsletter_subscribed` with the correct `source` tag.
- Pre-existing bug fixed: home hero CTA was previously writing to localStorage but never calling `/api/newsletter/subscribe` — now does both.
- Pre-existing bug fixed: prediction gate was POSTing to a non-existent `/api/email-subscribe` — now points at the canonical `/api/newsletter/subscribe`.
