# PostHog Dashboard Setup — Click-by-Click Guide

Companion to `events.md`. That doc tells you what events fire and how to wire them. **This doc tells you how to turn those events into useful product dashboards in the PostHog UI.**

Assumes you've already:

- Created the two PostHog projects (`tribunal-platform`, `tribunal-cms`) per `events.md` § PostHog setup
- Set the `VITE_POSTHOG_*` env vars and redeployed
- Confirmed events appear in **Activity → Live events** within ~30s of action

If those aren't true yet, do the wiring first. None of the dashboards below will populate without events.

---

## 0. Project-level settings (do these once)

PostHog → **Settings → Project** (per project, both `tribunal-platform` and `tribunal-cms`):

- [ ] **Persons & Identify** → "Person on events" → ensure enabled (lets you filter events by person properties)
- [ ] **Data → Properties**: mark these as PII-disallowed at the project level (defense-in-depth even though `lib/analytics.ts` already strips them):
  - `email`
  - `password`
  - `passwordHash`
  - `passwordResetToken`
  - `emailVerificationToken`
- [ ] **Web Analytics** → Disabled (we use explicit events only; autocapture is off)
- [ ] **Session recording** → Disabled in PostHog (we use Microsoft Clarity for replay)
- [ ] **Exception tracking** → If you want JS errors in PostHog, enable here AND set `capture_exceptions: true` in `lib/analytics.ts` (currently off)
- [ ] **Data retention**: confirm matches your SLA (PostHog default = 7 years on cloud; usually fine)

---

## 1. Build the four core dashboards

Create each via PostHog → **Dashboards → New dashboard**. Then add the insights below by clicking "Add insight" → "New insight" → choose Trends / Funnels / Retention / Stickiness / Lifecycle as noted.

### 1.1 Dashboard: **Acquisition**

Purpose: where users come from, and how many anonymous visitors convert.

| # | Insight | Type | Spec |
|---|---|---|---|
| A1 | Daily uniques | Trends | Series: `session_started` · Aggregation: `Unique users` · Date: last 30d · Chart: line |
| A2 | UTM source mix | Trends | Series: `utm_landed` · Breakdown: `source` · Chart: bar · Date: last 30d |
| A3 | UTM campaign performance | Trends | Series: `utm_landed` · Breakdown: `campaign` · Chart: stacked-bar · Date: last 30d |
| A4 | Anonymous → signup funnel | Funnel | Steps: `session_started` → `vote_recorded` → `signup_succeeded` · Window: 30 min · Date: last 30d |
| A5 | Signup volume by day | Trends | Series: `signup_succeeded` · Aggregation: total count · Chart: bar · Date: last 30d |
| A6 | Login prompt CTR | Trends | Series 1: `login_prompt_shown` · Series 2: `login_prompt_clicked` (filter `action != "dismiss"`) · Display: ratio (formula: B/A) · Date: last 30d |

### 1.2 Dashboard: **Engagement**

Purpose: are users voting, sharing, returning?

| # | Insight | Type | Spec |
|---|---|---|---|
| E1 | Daily vote volume | Trends | Series: `vote_recorded` · Chart: line · Date: last 30d |
| E2 | Votes by category | Trends | Series: `vote_recorded` · Breakdown: `category` · Chart: stacked-area · Date: last 30d |
| E3 | Top 20 polls (by votes) | Trends | Series: `vote_recorded` · Breakdown: `pollId` · Chart: table · Top 20 · Date: last 7d |
| E4 | Share volume by channel | Trends | Series: `share_clicked` · Breakdown: `channel` · Chart: bar · Date: last 30d |
| E5 | Vote retention | Retention | Cohort: performed `vote_recorded` · Returning: performed `vote_recorded` · Period: weekly · 8 weeks |
| E6 | DAU/WAU/MAU | Trends | Series: `$pageview` (or `vote_recorded`) · Aggregation: `Unique users` · Display: Active users (D/W/M) · last 30d |
| E7 | First vote → share funnel | Funnel | Steps: `first_vote_ever` → `share_clicked` · Window: 7 days · last 30d |
| E8 | Streak distribution | Trends | Series: `streak_extended` · Breakdown: `newStreak` · Histogram · last 30d |

### 1.3 Dashboard: **Auth funnel**

Purpose: optimize the signup/login experience and email verification rate.

| # | Insight | Type | Spec |
|---|---|---|---|
| F1 | Full signup funnel | Funnel | Steps: `signup_started` → `signup_field_completed` (filter `field=username`) → `…(field=email)` → `…(field=password)` → `signup_submitted` → `signup_succeeded` · Window: 30 min |
| F2 | Signup failure reasons | Trends | Series: `signup_failed` · Breakdown: `reason` · Chart: stacked-bar · last 30d |
| F3 | Email verification rate | Funnel | Steps: `signup_succeeded` → `email_verification_completed` · Window: 7 days · last 30d |
| F4 | Time to verify | Trends | Series: `email_verification_completed` · Aggregation: average of `hoursSinceSignup` · last 30d |
| F5 | Login failure reasons | Trends | Series: `login_failed` · Breakdown: `reason` · last 30d |
| F6 | Login prompt → signup conversion | Funnel | Steps: `login_prompt_shown` → `login_prompt_clicked` (filter `action=signup`) → `signup_succeeded` · Window: 1 day |
| F7 | (Phase 2) Password reset funnel | Funnel | Steps: `password_reset_requested` → `password_reset_completed` · Window: 1 day · *Wire events first* |

### 1.4 Dashboard: **Newsletter**

Purpose: which entry path actually converts to subscribers.

| # | Insight | Type | Spec |
|---|---|---|---|
| N1 | Subscriptions by source | Trends | Series: `newsletter_subscribed` · Breakdown: `source` · Chart: bar · last 90d |
| N2 | Subscriptions over time | Trends | Series: `newsletter_subscribed` · Display: cumulative · last 90d |
| N3 | Signup-attached subscriptions | Trends | Series: `newsletter_subscribed` · Filter: `source = signup` AND `optedIn = true` · last 30d |

---

## 2. Cohorts to define

PostHog → **People & Groups → Cohorts → New cohort** (Static cohorts auto-update over time):

- [ ] **Anonymous voters (3+ votes)** — performed `vote_recorded` ≥ 3 times AND has not performed `signup_succeeded` (in last 30 days)
- [ ] **Verified-email voters** — has performed `email_verification_completed` AND performed `vote_recorded` (last 30d)
- [ ] **Power users** — performed `vote_recorded` ≥ 10 in last 7 days
- [ ] **Lapsed users** — performed `vote_recorded` ≥ 1 in last 90 days AND has NOT performed `vote_recorded` in last 14 days
- [ ] **Share-driven** — performed `share_clicked` in last 30 days (good for share-gate analysis)
- [ ] **High-streak voters** — performed `streak_extended` AND `newStreak` ≥ 7

Use cohorts as filters in any insight, or as audience targets for in-product surveys (PostHog Surveys product).

---

## 3. Alerts & subscriptions

PostHog → on each insight → **⋯ menu → Subscribe** or **Set alert**:

- [ ] **Daily auth-funnel digest** → Subscribe to dashboard "Auth funnel" → daily email/Slack at 9am local
- [ ] **Signup failure spike** → Insight F2 → Set alert when `signup_failed` count > N per hour (set N to 2× current baseline)
- [ ] **Vote volume drop** → Insight E1 → Set alert when daily count drops > 30% vs 7-day average
- [ ] **Newsletter conversion drop** → Insight N1 → Set alert when `signup` source drops > 50% week-over-week

For Slack alerts: PostHog → **Settings → Alerts** → connect Slack workspace once.

---

## 4. Feature flags & A/B testing (optional, requires code change)

The current code does NOT wire `posthog.isFeatureEnabled()` anywhere. To use PostHog feature flags:

1. Add to `artifacts/tmh-platform/src/lib/analytics.ts`:
   ```ts
   export function isFeatureEnabled(key: string): boolean {
     if (!initialized || !consentApplied) return false
     return posthog.isFeatureEnabled(key) === true
   }

   export function onFeatureFlags(callback: () => void): void {
     if (!initialized) return
     posthog.onFeatureFlags(callback)
   }
   ```

2. Wrap conditional UI in `useFeatureFlag('flag-key')` — there's no built-in hook in posthog-js, write a small one:
   ```ts
   export function useFeatureFlag(key: string): boolean {
     const [enabled, setEnabled] = useState(false)
     useEffect(() => {
       const update = () => setEnabled(isFeatureEnabled(key))
       update()
       onFeatureFlags(update)
     }, [key])
     return enabled
   }
   ```

3. PostHog UI → **Feature Flags → New** → define a flag, choose rollout %, save.

4. Use in code: `if (useFeatureFlag('new-prediction-gate')) { … }`.

---

## 5. Surveys (optional, no code required)

PostHog → **Surveys → New survey** — runs entirely from the PostHog SDK we already loaded. Useful for:

- NPS to verified-email cohort
- Open-ended "what would make you vote more often?" to lapsed users cohort
- Yes/no "did the share modal work?" to users who just performed `share_clicked`

---

## 6. Heatmaps (NOT wired — autocapture is off)

The platform has `autocapture: false` in `lib/analytics.ts`, which disables PostHog Heatmaps. If you want heatmaps:

1. Decide whether you want the cardinality cost (autocapture sends a `$autocapture` event for every click — large volume).
2. If yes, change `autocapture: false` → `autocapture: { dom_event_allowlist: ['click'] }` (clicks-only is a sensible compromise).
3. PostHog → Toolbar → enable on the production site with your admin user → click around → heatmaps populate.

If you don't enable autocapture, **Heatmaps will be empty** in PostHog. Use Microsoft Clarity for heatmap-style insight (already wired and consent-gated).

---

## 7. CMS dashboard (`tribunal-cms` PostHog project)

The CMS PostHog project should have its own focused dashboard, separate from user analytics:

| # | Insight | Type | Spec |
|---|---|---|---|
| C1 | Press kit generations | Trends | Series: `cms_press_kit_generated` · Breakdown: `contentType` · last 30d |
| C2 | Digest pushes | Trends | Series: `cms_digest_pushed` · last 90d |
| C3 | Active admins | Trends | Series: `$pageview` · Aggregation: Unique users · last 30d |
| C4 | (Phase 2) Content publish rate | Trends | Series: `cms_content_published` · Breakdown: `contentType` · *requires new event* |
| C5 | (Phase 2) Resolution throughput | Trends | Series: `prediction_resolved` · Breakdown: `resolvedBy` · *requires posthog-node + new event* |

> See `cms-analytics-audit.md` for known issues with the current CMS instrumentation (no admin identify, no logout reset, no consent gate). Several of those need fixing before C3–C5 are reliable.

---

## 8. Verification checklist (post-setup)

- [ ] Each of the 4 platform dashboards has populated data (run private-window test plan from `events.md` § Test plan)
- [ ] CMS dashboard shows data after one round of CMS actions
- [ ] At least one cohort is non-empty
- [ ] At least one alert is enabled
- [ ] Person profiles in PostHog → **Persons** show events from before AND after signup (identify chain verified working)
- [ ] No `email` or `password` properties appear on any event in **Activity → Live events** (privacy contract verified)

If any of the above fails, do not proceed to dashboard interpretation — fix the wiring first.

---

## 9. Operational notes

- **Renaming an insight or dashboard** is fine. Renaming an **event** or **property** breaks history (PostHog treats it as a new event). See `events.md` § Operational rules.
- **Sharing dashboards externally**: PostHog → dashboard → Share → "Share publicly" gives a read-only link. Use sparingly — anyone with the link sees the data.
- **Embedding in CMS**: PostHog supports `<iframe>` embeds with the same share-link pattern, if you want a built-in admin analytics page (the existing CMS `/analytics` route can render this).
- **Cost**: PostHog cloud is free up to 1M events/month. Heavy events like `feed_scrolled` (Phase 2) can blow past this — sample at 10% server-side or use `feature_flag` to scope to internal users while validating.
