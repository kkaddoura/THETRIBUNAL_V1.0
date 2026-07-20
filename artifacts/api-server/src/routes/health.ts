import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const handleHealthCheck = (_req: Request, res: Response) => {
  res.set("X-Build-Commit", process.env.RAILWAY_GIT_COMMIT_SHA ?? "local");
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
};

router.get("/healthz", handleHealthCheck);
router.get("/health", handleHealthCheck);

export default router;
