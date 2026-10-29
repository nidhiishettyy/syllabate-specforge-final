import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { ApiError, fail, ok } from "./envelope.js";
import { configFromRequest, generateJson } from "./llm.js";

export const app = express();
app.use(express.json({ limit: "10mb" }));

export const api = express.Router();

api.get("/health", (_req, res) => ok(res, { status: "up" }));

// "Test key" button in Settings. Proves the key and model work, nothing more.
api.get("/llm-check", async (req, res, next) => {
  try {
    const cfg = configFromRequest(req);
    const out = await generateJson('Return exactly {"pong": true}', z.object({ pong: z.boolean() }), cfg);
    ok(res, { provider: cfg.provider, model: cfg.model, reply: out });
  } catch (e) {
    next(e);
  }
});

// Your routes go here (Level 1 onward).

// The scorer runs your app and calls this route with the sample files, exactly like `npm run verify` does.
// Contract: multipart fields "spec" (required) and "blueprint" (optional), AI key in the x-llm-* headers.
// Reply: { success: true, data: { output: <specforge_output object>, html: "<the filled spec document>" } }
// Level 3 builds it. Until then it answers 501.
import { runGeneration } from "./engine.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
api.post(
  "/generate",
  upload.fields([
    { name: "spec", maxCount: 1 },
    { name: "blueprint", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const cfg = configFromRequest(req);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const specFile = files?.spec?.[0];
      if (!specFile) {
        throw new ApiError(400, "MISSING_SPEC", "A course specification file ('spec') is required.");
      }

      const blueprintFile = files?.blueprint?.[0];

      const result = await runGeneration({
        specBuffer: specFile.buffer,
        specName: specFile.originalname,
        blueprintBuffer: blueprintFile?.buffer,
        blueprintName: blueprintFile?.originalname,
        cfg,
      });

      ok(res, result);
    } catch (e) {
      next(e);
    }
  }
);

app.use("/api/v1", api);
app.use("/api", (_req, res) => fail(res, 404, "NOT_FOUND", "No such route"));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) return fail(res, err.status, err.code, err.message);
  console.error("Unhandled:", err instanceof Error ? err.message : "unknown error"); // never log headers or keys
  fail(res, 500, "SERVER_ERROR", "Something went wrong on the server.");
});
