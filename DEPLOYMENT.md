# Deployment Guide — TMH Platform

Deploy the TMH Platform to **Railway** (app server) + **Supabase** (PostgreSQL database).

```
Architecture (Production)
─────────────────────────

  tribunal.com ──────────┐
                         │     ┌─────────────────────────────────┐
                         ├───▶ │  Railway — Single Node.js Service │
                         │     │                                   │
  cms.tribunal.com ──────┘     │  tribunal.com     → Platform SPA  │
                               │  cms.tribunal.com → CMS Admin SPA │
                               │  */api/*          → Express API    │
                               │                                   │
                               └──────────┬────────────────────────┘
                                          │
                                          ▼
                               ┌─────────────────────────┐
                               │  Supabase — PostgreSQL   │
                               │  (managed database)      │
                               └─────────────────────────┘
```

Both domains point to the **same Railway service** on a single port. The Express server routes by hostname:
- **`tribunal.com`** → TMH Platform (main website)
- **`cms.tribunal.com`** → CMS Admin Panel
- **`*/api/*`** → API routes (accessible from both domains)

---

## Prerequisites

| Requirement | Notes |
|---|---|
| [Node.js 18+](https://nodejs.org) | Runtime |
| [pnpm](https://pnpm.io) | `npm install -g pnpm` |
| [Railway CLI](https://docs.railway.com/guides/cli) | `npm install -g @railway/cli` |
| [Railway account](https://railway.com) | Free tier works for testing |
| [Supabase account](https://supabase.com) | Free tier includes a Postgres instance |

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
2. Choose a region close to your Railway deployment (e.g., `us-east-1` or `eu-west-1`)
3. Set a strong database password — you'll need it for the connection string
4. Wait for the project to finish provisioning (~2 minutes)

### Get Your Connection String

1. Go to **Project Settings** → **Database**
2. Under **Connection string**, select **URI** format
3. Copy the **Session Mode** connection string (port `5432`):
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

> **Important**: Use port `5432` (Session mode), not `6543` (Transaction mode). Drizzle ORM uses features that require session-level connections.

---

## Step 2 — Initialize the Database

Run the setup script from the repo root:

```bash
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" \
  ./scripts/setup-db.sh
```

This does three things:
1. **Pushes the Drizzle schema** — creates all 17 tables with indexes and foreign keys
2. **Seeds CMS data** — 230 predictions, 56 pulse topics, design tokens, homepage config, page configs, and site settings
3. **Seeds Majlis test data** — 5 test users, 4 channels, and 30+ sample messages

To skip the Majlis test data:
```bash
DATABASE_URL="..." SKIP_MAJLIS_SEED=1 ./scripts/setup-db.sh
```

### What Gets Created

| Table | Records | Purpose |
|---|---|---|
| predictions | 230 | Prediction market questions across 10 categories |
| pulse_topics | 56 | Real-time trending data with sparklines |
| cms_configs | 12 | Homepage, page configs, site settings, nav, footer |
| design_tokens | 13 | Brand colors and design system values |
| profiles | 8 | Featured founder/operator profiles |
| polls + poll_options | 7 + 24 | Debate polls with answer options |
| majlis_users | 5 | Test users (password: `TestPass123!`) |
| majlis_channels | 4 | General, MENA Tech Talk, Founders Room, DM |
| majlis_messages | 32 | Sample encrypted conversations |

---

## Step 3 — Generate Security Keys

You need three secrets for production. Generate them now:

```bash
# 64-char hex key for encrypting Majlis messages
echo "MAJLIS_ENCRYPTION_KEY=$(openssl rand -hex 32)"

# Admin API key
echo "ADMIN_KEY=$(openssl rand -base64 32)"

# CMS credentials — pick your own
echo "CMS_USERNAME=your_admin_username"
echo "CMS_PIN=your_secure_pin"
```

Save these — you'll set them as Railway environment variables in the next step.

> **Warning**: If you seeded Majlis data with a specific `MAJLIS_ENCRYPTION_KEY`, you must use the **same key** in production. Otherwise the encrypted messages will be unreadable. If starting fresh (no Majlis seed), any new key works.

---

## Step 4 — Deploy to Railway

### 4a. Login and Create Project

```bash
railway login
railway init
```

Choose a name (e.g., `tmh-platform`). This links the current directory to a Railway project.

### 4b. Set Environment Variables

Set all required variables in the Railway dashboard (**Service → Variables**) or via CLI:

```bash
# Required
railway variables set NODE_ENV=production
railway variables set BASE_PATH=/
railway variables set DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
railway variables set MAJLIS_ENCRYPTION_KEY="<your-64-char-hex>"
railway variables set CMS_USERNAME="<your-username>"
railway variables set CMS_PIN="<your-pin>"
railway variables set ADMIN_KEY="<your-admin-key>"

# AI — required for Ideation Engine
railway variables set ANTHROPIC_API_KEY="sk-ant-..."
railway variables set PERPLEXITY_API_KEY="pplx-..."

# Optional — email integrations
railway variables set RESEND_API_KEY="re_..."
railway variables set BEEHIIV_API_KEY="..."
railway variables set BEEHIIV_PUBLICATION_ID="pub_..."

# Optional — Cloudflare R2 media storage
railway variables set R2_ACCOUNT_ID="..."
railway variables set R2_ACCESS_KEY_ID="..."
railway variables set R2_SECRET_ACCESS_KEY="..."
railway variables set R2_BUCKET_NAME="tmh-uploads"
railway variables set R2_PUBLIC_URL="https://pub-REPLACE.r2.dev"
```

> **Note**: `PORT` is auto-set by Railway — do not set it manually.

### 4c. Deploy

**Option A — Deploy via CLI** (push current code):
```bash
railway up
```

**Option B — Connect GitHub** (auto-deploy on push):
1. Go to Railway Dashboard → your project → **Settings**
2. Under **Source**, connect your GitHub repo
3. Set the branch to `main`
4. Every push to `main` will trigger a new deployment

### What Railway Runs

These are configured in `railway.toml`:

| Phase | Command |
|---|---|
| **Build** | `pnpm install --frozen-lockfile && pnpm run build` |
| **Start** | `node artifacts/api-server/dist/index.cjs` |
| **Health check** | `GET /api/healthz` (30s timeout) |

The build compiles all TypeScript libs, bundles the Express API server, and builds both React SPAs into static files.

---

## Step 5 — Verify Deployment

Once Railway shows the deployment as "Active":

### Check the health endpoint
```bash
curl https://your-app.up.railway.app/api/healthz
```

### Visit the sites

| URL | What you should see |
|---|---|
| `https://tribunal.com` | TMH Platform homepage |
| `https://cms.tribunal.com` | CMS login page |
| `https://tribunal.com/api/polls` | JSON list of polls |

Before custom domains, use the Railway test URL:

| URL | What you should see |
|---|---|
| `https://your-app.up.railway.app` | TMH Platform homepage |
| `https://your-app.up.railway.app/cms` | CMS login page (path fallback) |
| `https://your-app.up.railway.app/api/polls` | JSON list of polls |

### Test CMS login
1. Go to `/cms`
2. Enter the `CMS_USERNAME` and `CMS_PIN` you set
3. You should see the admin dashboard with predictions, polls, and pulse data

---

## Step 6 — Custom Domains

Both domains point to the same Railway service. The Express server uses the `Host` header to decide which SPA to serve.

### In Railway Dashboard
1. Go to **Service → Settings → Networking → Custom Domains**
2. Add **two** domains:
   - `tribunal.com`
   - `cms.tribunal.com`
3. Railway will give you a CNAME target for each (usually the same value)

### In Your DNS Provider

| Type | Name | Value |
|---|---|---|
| CNAME | `@` or root | `<railway-cname-target>` |
| CNAME | `www` | `<railway-cname-target>` |
| CNAME | `cms` | `<railway-cname-target>` |

> Some DNS providers don't support CNAME on root — use an ALIAS or ANAME record instead, or use Cloudflare (which proxies it).

Railway provisions SSL automatically for all custom domains once DNS propagates.

### How Routing Works

The server checks `req.hostname`:
- Hostname starts with `cms.` → serves CMS admin SPA
- Everything else → serves TMH Platform SPA
- `/api/*` is available on both domains

### Fallback for Testing

Before custom domains are set up, the CMS is served at the `/cms` path on the Railway test domain:
- `https://your-app.up.railway.app` → Platform
- `https://your-app.up.railway.app/cms` → CMS

This works because `CMS_BASE_PATH=/cms/` is set in the Dockerfile by default.

### CMS Routing Options

The CMS can be accessed via **path-based** or **subdomain-based** routing. The `CMS_BASE_PATH` variable in the Dockerfile controls which mode is active.

#### Option A — Path routing (`yourdomain.com/cms`)

Keep the Dockerfile default:
```dockerfile
ARG CMS_BASE_PATH=/cms/
```

| URL | Serves |
|---|---|
| `yourdomain.com` | Platform |
| `yourdomain.com/cms` | CMS Admin |
| `yourdomain.com/api/*` | API |

No subdomain or extra DNS needed. This is the current default for the Railway test domain.

#### Option B — Subdomain routing (`cms.yourdomain.com`)

Change the Dockerfile:
```dockerfile
ARG CMS_BASE_PATH=/
```

| URL | Serves |
|---|---|
| `yourdomain.com` | Platform |
| `cms.yourdomain.com` | CMS Admin (at root `/`) |
| `*/api/*` | API (both domains) |

Then:
1. Add both `yourdomain.com` and `cms.yourdomain.com` as custom domains in Railway (Settings → Networking)
2. Point DNS CNAME records for `@`/`www` and `cms` to the Railway CNAME target
3. Redeploy

#### Switching between modes

Only one thing changes: `CMS_BASE_PATH` in the Dockerfile. Update the `ARG` line and redeploy — no other code changes needed.

### Using a Different Domain

If your domain is not `tribunal.com`, update the CORS config in `artifacts/api-server/src/app.ts`:

```typescript
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [
        "https://yourdomain.com",
        "https://www.yourdomain.com",
        "https://cms.yourdomain.com",
      ]
    : true;
```

> **Note**: Since both frontends and the API are served from the same origin (same Railway service), CORS only matters if you call the API from a third-party domain.

---

## Environment Variables Reference

### Required

| Variable | Status | Description |
|---|---|---|
| `DATABASE_URL` | **Added** | Supabase Postgres via pooler (session mode, port 5432) |
| `NODE_ENV` | **Added** | Set to `production` |
| `BASE_PATH` | **Added** | Set to `/` |
| `UPLOADS_DIR` | **Added** | Set to `uploads` |
| `MAJLIS_ENCRYPTION_KEY` | **Added** | AES-256 key for encrypting Majlis messages (64-char hex) |
| `CMS_USERNAME` | **Added** | CMS admin login username |
| `CMS_PIN` | **Added** | CMS admin login PIN |
| `ADMIN_KEY` | **Added** | API admin key for protected endpoints |
| `CMS_BASE_PATH` | **Added** | CMS URL prefix: `/cms/` for Railway test domain, `/` for `cms.yourdomain.com` subdomain |

### AI (required for Ideation Engine)

| Variable | Status | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Not added** | Claude API key — get from console.anthropic.com |
| `PERPLEXITY_API_KEY` | **Not added** | Perplexity API key — get from perplexity.ai |

### Email (optional)

| Variable | Status | Description |
|---|---|---|
| `RESEND_API_KEY` | **Not added** | Resend.com transactional email |
| `BEEHIIV_API_KEY` | **Not added** | Beehiiv newsletter integration |
| `BEEHIIV_PUBLICATION_ID` | **Not added** | Beehiiv publication ID |

### Media Storage (optional)

| Variable | Status | Description |
|---|---|---|
| `R2_ACCOUNT_ID` | **Not added** | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | **Not added** | R2 API token key ID |
| `R2_SECRET_ACCESS_KEY` | **Not added** | R2 API token secret |
| `R2_BUCKET_NAME` | **Not added** | R2 bucket name (default: `tmh-uploads`) |
| `R2_PUBLIC_URL` | **Not added** | Public URL for serving R2 files |

### Auto-set by Railway

| Variable | Notes |
|---|---|
| `PORT` | Do not set manually — Railway injects this |

---

## Troubleshooting

### Build fails with TypeScript errors

The most common deploy failure. Railway runs `pnpm run typecheck` as part of the build, and strict settings (`noImplicitReturns`, `strictNullChecks`, Express 5 types) can surface errors that don't appear in your editor.

- Run `pnpm run preflight` locally to catch these before pushing
- The pre-push hook should block pushes with type errors automatically
- Test files (`src/__tests__/`) are excluded from typecheck to avoid false positives
- Express 5 types (`@types/express ^5`) type `req.params` as `string | string[]` — use `String(req.params.x)` to narrow

### Build fails with missing native binaries

The `pnpm-workspace.yaml` excludes platform-specific binaries to keep installs fast. The Linux x64 (glibc) variants needed by Railway are **not** excluded and should work out of the box. If you hit a missing binary error:

```bash
# In pnpm-workspace.yaml, ensure these are NOT in the overrides:
# esbuild>@esbuild/linux-x64
# rollup>@rollup/rollup-linux-x64-gnu
# lightningcss>lightningcss-linux-x64-gnu
# @tailwindcss/oxide>@tailwindcss/oxide-linux-x64-gnu
```

### Database connection refused

- Verify you're using **Session mode** (port `5432`), not Transaction mode (port `6543`)
- Check that your Supabase project is active (free-tier projects pause after 1 week of inactivity)
- Ensure the connection string password doesn't contain unescaped special characters

### Health check fails (deployment keeps restarting)

- Check Railway logs: **Service → Deployments → View Logs**
- Common causes:
  - Missing `DATABASE_URL` — the server throws on startup without it
  - Missing `MAJLIS_ENCRYPTION_KEY` — logged as a warning but non-fatal
  - Wrong `DATABASE_URL` format — must start with `postgresql://`

### CMS login doesn't work

- Verify `CMS_USERNAME` and `CMS_PIN` are set in Railway variables
- These are checked at the API level (`/api/cms/auth`), not at the frontend

### Majlis messages appear garbled

- You're using a different `MAJLIS_ENCRYPTION_KEY` than the one used during seeding
- Either re-seed with the current key, or switch to the key used during `setup-db.sh`

### Supabase project paused (free tier)

Free Supabase projects pause after 7 days of inactivity. To prevent this:
- Upgrade to Pro ($25/mo), or
- The Railway health check pings the DB regularly, which should keep it active

---

## Redeploying

### Pre-deploy Verification

Always verify the build passes locally before pushing. The project includes safeguards at multiple levels:

**1. Automatic (pre-push hook)**

A Husky pre-push hook runs `pnpm run typecheck` before every `git push`. If typecheck fails, the push is blocked. This is your last line of defense.

**2. Quick check (recommended before deploying)**

```bash
pnpm run preflight
```

Runs the full monorepo typecheck — the same step that fails most Railway builds.

**3. Full Docker build (exact Railway parity)**

```bash
pnpm run preflight:full
```

Builds a Docker image that mirrors Railway's Nixpacks pipeline. If this passes, Railway will pass.

### Deploy

```bash
# Option A: CLI push
railway up

# Option B: Git push (if GitHub is connected)
git push origin main
```

Railway will rebuild and redeploy automatically. Zero-downtime deploys are enabled by default via the health check.

### Schema Changes

If you modify Drizzle schema files (`lib/db/src/schema/*.ts`):

```bash
# Push schema changes to Supabase
DATABASE_URL="..." pnpm --filter @workspace/db run push
```

> `drizzle-kit push` is safe to run repeatedly — it only applies the diff.
