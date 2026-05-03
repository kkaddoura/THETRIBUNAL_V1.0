# Deployment Steps — Launch Day Runbook

Run these in order before/at launch.

---

## ✅ Already executed on Supabase prod DB (2026-04-05)

- **Migration applied** via `DATABASE_URL=... pnpm --filter @workspace/db run push`
  - Added `poll_options.dummy_vote_count` (int, default 0)
  - Added `predictions.dummy_total_count` (int, default 0)
  - Added `predictions.dummy_option_results` (jsonb, nullable)
- **Seed script run** via `DATABASE_URL=... npx tsx ./src/seed-dummy-votes.ts`
  - Seeded dummy votes for **410 approved debates** (20-70 each with realistic ratios)
  - Seeded dummy votes for **230 approved predictions**
- **Content curation run** via `DATABASE_URL=... npx tsx ./src/curate-content.ts --apply`
  - Archived **310 debates** (kept 100: 1 featured + 39 editor's picks + 60 oldest multi-option)
  - Archived **130 predictions** (kept 100: 6 featured + 94 oldest non-featured)
  - All remaining items have dummy votes seeded

**Final DB state:**
- 100 approved debates (all multi-option quality items)
- 100 approved predictions
- Archived items retained in DB (reversible via CMS if needed)

---

## 0. Pre-flight checks

```bash
# All commits are pushed
git status           # should be clean
git log origin/main --oneline -10   # verify all session commits are there

# All tests pass
npx vitest run

# All typechecks pass
pnpm run typecheck
```

---

## 1. Apply DB migration (NEW — dummy vote columns)

Migration file: `lib/db/drizzle/0004_dummy_votes.sql`

Adds:
- `poll_options.dummy_vote_count` (int, default 0)
- `predictions.dummy_total_count` (int, default 0)
- `predictions.dummy_option_results` (jsonb, nullable)

### Option A: Drizzle push (recommended for development / small DBs)
```bash
export DATABASE_URL="postgresql://..."
pnpm --filter @workspace/db run push
```

Drizzle will detect the schema change and prompt for confirmation.

### Option B: Direct SQL
If you prefer manual control, run the migration file directly:
```bash
psql "$DATABASE_URL" -f lib/db/drizzle/0004_dummy_votes.sql
```

**Rollback:** If needed, drop the columns:
```sql
ALTER TABLE poll_options DROP COLUMN dummy_vote_count;
ALTER TABLE predictions DROP COLUMN dummy_total_count;
ALTER TABLE predictions DROP COLUMN dummy_option_results;
```

---

## 2. Seed dummy votes

Populates 20-70 dummy votes per approved debate + prediction with realistic distributions.

```bash
export DATABASE_URL="postgresql://..."
pnpm -C scripts tsx src/seed-dummy-votes.ts
```

**Expected output:**
```
Seeding dummy votes...
Found N approved debates
Seeded dummy votes for N debates
Found M approved predictions
Seeded dummy votes for M predictions
Done! Dummy votes seeded successfully.
```

**Idempotency:** The script OVERWRITES existing dummy counts. Running it twice gives you a fresh random distribution. Use the CMS "Boost All" button to incrementally add votes instead.

**Reset to 0:** If you want to clear dummy votes:
```sql
UPDATE poll_options SET dummy_vote_count = 0;
UPDATE predictions SET dummy_total_count = 0, dummy_option_results = NULL;
```

---

## 3. Configure feature toggles via CMS

1. Log into CMS
2. Go to **Site Settings** → **Feature Toggles** tab
3. Set for launch:
   - **Majlis:** OFF (hide from pre-launch visitors)
   - **Share Gate:** ON (want viral growth)
   - **Email Capture:** ON (want email list building)
   - **IP Consent:** OFF (default off, can enable after launch once you've updated privacy policy)
4. Save

Verify changes propagated: open the public site in incognito and check that Majlis references are gone.

---

## 4. Curate content (if needed)

The dummy votes seed script seeds all **approved** items. If you have low-quality AI-generated debates/predictions still marked as approved, they'll get dummy votes too.

To archive low-quality items before seeding:
1. Open CMS → Debates or Predictions
2. Filter by editorial status or sort by date
3. Bulk archive or manually set status to "archived"
4. Re-run the seed script if desired

Target: ~100 quality items per pillar for launch.

---

## 5. Spot-check the website

Open https://tribunal.com (or your staging URL) and verify:

- [ ] Homepage loads, featured debate shows dummy votes (not 0)
- [ ] Debates listing shows all cards with realistic vote counts
- [ ] Click a debate → vote → results appear immediately (no confirmation)
- [ ] Click "Over Time" tab → trend chart shows
- [ ] Click "By Country" tab → country breakdown shows
- [ ] Click share icon → modal opens → download works
- [ ] No Majlis references anywhere (nav, homepage, profile page, debate cards)
- [ ] FAQ mentions Instagram, not Telegram

---

## 6. Monitor after launch

### Key metrics to watch
- Vote rate (should trend upward as users come in)
- CMS dashboard: Real Votes vs Dummy Votes ratio
- Country distribution (if IP consent enabled)
- Error rate in `/api/polls/:id/vote`
- ip-api.com rate limit (45 req/min) — watch for 429 errors in logs

### Rollback strategy
If something goes wrong:
1. Revert the last commit: `git revert <sha>` + push
2. Re-deploy
3. If a DB issue: schema changes are additive, safe to leave the new columns (default 0 = no impact on old code reading combined totals)

---

## 7. Post-launch follow-ups (non-blocking)

See `impact-analysis.md` "Things still to do" section:
- Wire colored punctuation to FAQ, Contact, Terms, etc.
- Phase 3: Chatbot "Noor" character overhaul
- Per-poll OG images for LinkedIn/Twitter previews
- API-level tests

---

## Emergency contacts

- **Railway deploy logs:** Check Railway dashboard
- **Supabase DB logs:** Supabase project dashboard
- **ip-api.com status:** https://status.ip-api.com
