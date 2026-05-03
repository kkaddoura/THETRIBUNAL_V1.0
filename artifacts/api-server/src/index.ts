import app from "./app";
import { seedCmsData } from "@workspace/db/seed-cms";
import { pool } from "@workspace/db";

// Warn if critical security env vars are missing in production
if (process.env.NODE_ENV === "production") {
  const missing = ["MAJLIS_ENCRYPTION_KEY", "DATABASE_URL"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[SECURITY] Missing required production env vars: ${missing.join(", ")}`);
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, "0.0.0.0", async () => {
  console.log(`Server listening on port ${port}`);
  try {
    await seedCmsData();
  } catch (err) {
    console.error("CMS seed error (non-fatal):", err);
  }
});

const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed");
    pool.end().then(() => {
      console.log("Database pool closed");
      process.exit(0);
    });
  });
  // Force shutdown after 10s
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
