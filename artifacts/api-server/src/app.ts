import express, { type Request, type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { ogTagsMiddleware } from "./middlewares/ogTags";
import { optionalAuth } from "./middlewares/auth";

const app: Express = express();

// ── Domain configuration ────────────────────────────────────
// In production, tribunal.com serves the main site and
// cms.tribunal.com serves the CMS admin panel.
// Both domains point to this single Railway service.

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [
        "https://tribunal.com",
        "https://www.tribunal.com",
        "https://cms.tribunal.com",
      ]
    : true; // allow all origins in development

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Decorate every API request with req.userId if a valid session cookie is
// present. Routes that need auth use the requireAuth middleware additionally.
app.use("/api", optionalAuth);

// ── Hostname routing helper ─────────────────────────────────
// Matches "cms.*" subdomain pattern (works with any root domain).

function isCmsHost(req: Request): boolean {
  return req.hostname.startsWith("cms.");
}

// ── Pre-built static middleware instances ────────────────────

const cmsStatic = express.static(
  path.join(process.cwd(), "artifacts/cms/dist/public"),
);
const platformStatic = express.static(
  path.join(process.cwd(), "artifacts/tmh-platform/dist/public"),
);

// ── Bot-detection OG middleware ──────────────────────────────
// Intercepts social crawler requests to SPA routes and returns
// pre-rendered OG meta HTML. Only applies to non-API, non-CMS routes.
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || isCmsHost(req)) return next();
  return ogTagsMiddleware(req, res, next);
});

// ── Disable caching for CMS API routes ─────────────────────
// Prevents 304 Not Modified responses that return stale data
// after mutations (e.g., status updates not reflected in list).
app.use("/api/cms", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// ── Auth rate limiting ──────────────────────────────────────
// Only apply to credential-validating endpoints. /me, /avatars, /logout,
// /link-voter-token are called on normal page loads and would exhaust a
// shared bucket within a single signup→logout→login cycle.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// CMS + Majlis auth are single-endpoint routers, so blanket-mounting is fine.
app.use("/api/cms/auth", authLimiter);
app.use("/api/majlis/auth", authLimiter);

// User auth has many endpoints — only rate-limit the credential ones.
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

// ── API routes ──────────────────────────────────────────────

app.use("/api", router);

app.get("/download/tmh-platform.html", (_req, res) => {
  res.download(
    path.join(process.cwd(), "artifacts/tmh-platform/public/tmh-platform-standalone.html"),
    "tmh-platform.html",
  );
});

// ── Static files — routed by hostname ───────────────────────
// cms.tribunal.com  → CMS SPA at root /
// tribunal.com      → TMH Platform SPA at root /
// Fallback: /cms path still works for the Railway test domain.

app.use("/cms", cmsStatic);

app.use((req, res, next) => {
  if (isCmsHost(req)) return cmsStatic(req, res, next);
  return platformStatic(req, res, next);
});

// ── SPA fallbacks ───────────────────────────────────────────

app.use("/cms", (_req, res) => {
  res.sendFile(
    path.join(process.cwd(), "artifacts/cms/dist/public/index.html"),
  );
});

app.use((req, res) => {
  const dir = isCmsHost(req) ? "cms" : "tmh-platform";
  res.sendFile(
    path.join(process.cwd(), `artifacts/${dir}/dist/public/index.html`),
  );
});

// ── Global error handler — must be last middleware ──────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[UNHANDLED ERROR]", err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;
