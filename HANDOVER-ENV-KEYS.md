# The Tribunal — Environment Keys (Handover)

> Key **names only** — no values. Pull the real values from the Railway project's
> Variables panel (and the providers below) and fill them in securely. Do **not**
> commit a copy of this file with values added.

## Services in use

| Service | Used for |
|---|---|
| **Railway** | Hosting / deploy (api-server + CMS + platform) |
| **Supabase** | Postgres database (and optional file storage) |
| **Cloudflare R2** | Primary file/asset storage |
| **Anthropic (Claude)** | Captions, ideation generation, chatbot |
| **Perplexity** | Ideation research (live news) |
| **OpenAI** | AI integration |
| **Resend** | Newsletter / transactional email |

---

## Backend — `api-server` (Railway service)

```env
# Runtime / hosting
NODE_ENV=
PORT=
BASE_PATH=
UPLOADS_DIR=
APP_URL=
TRIBUNAL_URL=
INTERNAL_API_URL=

# Database — Supabase Postgres
DATABASE_URL=

# Auth & app secrets
CMS_USERNAME=
CMS_PIN=
ADMIN_KEY=
MAJLIS_ENCRYPTION_KEY=
UNSUBSCRIBE_SECRET=

# AI providers
ANTHROPIC_API_KEY=
PERPLEXITY_API_KEY=
GEMINI_API_KEY=
AI_INTEGRATIONS_OPENAI_API_KEY=
AI_INTEGRATIONS_OPENAI_BASE_URL=

# Email & newsletter
RESEND_API_KEY=
NEWSLETTER_FROM=
TEST_FROM=
BEEHIIV_API_KEY=
BEEHIIV_PUBLICATION_ID=

# Newsletter cron (set to "true" only on prod to enable scheduled sends)
DIGEST_CRON_ENABLED=

# Storage — Cloudflare R2 (primary)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Storage — Supabase Storage (optional / alternative to R2)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## CMS frontend — `cms` (Vite, build-time)

```env
PORT=
BASE_PATH=
VITE_API_BASE_URL=
VITE_CMS_POSTHOG_KEY=
VITE_CMS_POSTHOG_HOST=
VITE_CMS_ANALYTICS_DISABLED=
```

---

## Platform frontend — `tmh-platform` (Vite, build-time)

```env
PORT=
BASE_PATH=
VITE_API_BASE_URL=
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
VITE_CLARITY_PROJECT_ID=
```

---

### Notes for Kareem
- `VITE_*` are **build-time** vars — set them in Railway before/at build, not just at runtime.
- The three apps are separate workspaces but deploy together on Railway (the api-server also serves the built CMS + platform by hostname).
- Real values live in the **Railway Variables** panel — request access there rather than copying secrets into docs/chat.
