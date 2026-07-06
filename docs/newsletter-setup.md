# Weekly Newsletter — Setup & Operations

The Tribunal's weekly editorial newsletter. This doc covers how it's delivered,
what's required to go live, and how to send issues.

## Delivery: Resend (not Beehiiv)

The newsletter is rendered as HTML by the platform and sent via **Resend** to the
subscribers in our own `newsletter_subscribers` table.

**Why not Beehiiv?** Beehiiv's HTML post/send API (`POST /posts`) is **enterprise-only**.
We confirmed this against the live account:

```
HTTP 403 — code: SEND_API_NOT_ENTERPRISE_PLAN
```

So Beehiiv cannot accept our designed HTML on the current plan. Beehiiv is still used
for **subscriber sync** (`/subscriptions`, not enterprise-gated); delivery is via Resend.

## What must be true to send to real subscribers

1. **`thetribunal.me` verified in Resend.** Add the DNS records Resend shows under
   resend.com/domains → Add Domain. Until this is done, send-to-all and the cron will
   fail with a 403 "domain is not verified". (A test to the Resend account owner's own
   address works via `onboarding@resend.dev` before verification.)
2. **Env vars set** (see `.env.production.example`):
   - `RESEND_API_KEY`
   - `NEWSLETTER_FROM` = `The Tribunal <newsletter@thetribunal.me>`
   - `TRIBUNAL_URL` = `https://thetribunal.me`
   - `UNSUBSCRIBE_SECRET` (≥16 chars) — already required.
3. **`DIGEST_CRON_ENABLED=true`** only when you want the automated Friday send.

## Sending an issue

### From the CMS (manual)
CMS → Weekly Newsletter:
- **Refresh preview** — re-runs selection against live debates and re-renders.
- **Send test** — enter any address; sends one copy. Use this before every real send.
- **Send to all subscribers** — confirms, then sends to all opted-in subscribers.
  Idempotent: re-running in the same ISO week is skipped unless forced.

### Automated (cron) — schedule editable from the CMS
With `DIGEST_CRON_ENABLED=true` (the env gate that turns the scheduler on at all), a
per-minute heartbeat reads the **CMS-editable schedule** and sends when due.

Set the schedule in CMS → Weekly Newsletter → **Automated weekly send**: an Enabled
toggle + day-of-week + time + timezone. Changes take effect immediately (the heartbeat
re-reads the config each tick) — no redeploy. Stored in `cms_configs` under
`newsletter_schedule` (default: disabled, Friday 09:00 Asia/Dubai).

A Postgres advisory lock + per-week idempotency prevent double-sends across replicas.
Two gates must both be on to auto-send: `DIGEST_CRON_ENABLED=true` (infra) **and** the
CMS Enabled toggle (editorial).

## How the issue is built (automatic selection)

- **The Week's Signal** — an `isEditorsPick` debate if available, else the most-divided
  debate (smallest gap between the top two options) above a 10-vote floor. Toggle
  Editor's Pick on a poll in the CMS to steer the Signal.
- **The Split** — the most-divided remaining debate.
- **One to Watch** — the highest-engagement prediction, else a third debate.
- **Vote labels** — `<50` Early signal · `50–150` Current split (if divided) / Live debate ·
  `>150` Live debate. Always shows the real count.
- **Copy** — generated deterministically with hedged language and passed through a
  banned-phrase linter (`newsletter-lint.ts`) so no overclaiming phrase can ship.
- **Infographic** — currently rendered as an HTML "Split card" (renders everywhere, no
  hosting needed). A higher-res PNG version exists in the Studio pipeline and can be
  embedded once `SUPABASE_SERVICE_ROLE_KEY` is set (Supabase Storage).

## Unsubscribe

Every email includes an RFC-8058 one-click unsubscribe + a footer link, using
HMAC-signed tokens (`lib/unsubscribe.ts`). Handled by the existing
`/api/newsletter/unsubscribe` routes; no Beehiiv dependency.

## Key files

| Concern | File |
|---|---|
| Selection from live data | `artifacts/api-server/src/services/newsletter-select.ts` |
| HTML renderer | `artifacts/api-server/src/services/newsletter-html.ts` |
| Send via Resend (test/all) | `artifacts/api-server/src/services/newsletter-send.ts` |
| Banned-phrase linter | `artifacts/api-server/src/services/newsletter-lint.ts` |
| CMS endpoints | `artifacts/api-server/src/routes/digest.ts` (`/cms/newsletter/*`) |
| CMS page | `artifacts/cms/src/pages/newsletter-digest.tsx` |
| Weekly cron | `artifacts/api-server/src/lib/cron.ts` |

## Beehiiv dashboard (already configured)

Sender "The Tribunal", reply-to `kareem@thetribunal.me`, author-name toggle off,
footer address set (Dubai placeholder — replace with the real registered address when
legal is finalized). These only matter if you also send anything from Beehiiv itself.
