import aiRoutes from "./routes/ai.routes.js";
import express from "express";
import cors from "cors";
import path from "node:path";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.routes.js";
import { entitiesRouter } from "./routes/entities.routes.js";
import { uploadsRouter } from "./routes/uploads.routes.js";
import { gamesRouter } from "./routes/games.routes.js";
import { rewardsRouter } from "./routes/rewards.routes.js";
import { listingsRouter } from "./routes/listings.routes.js";
import { assistantRouter } from "./routes/assistant.routes.js";
import { stripeRouter } from "./routes/stripe.routes.js";
import { socialRouter, adminRouter } from "./routes/social.routes.js";
import { notFoundHandler, errorHandler } from "./lib/errors.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use("/api/ai", aiRoutes);
app.use(
    cors()
  );

  app.use("/api/ai", aiRoutes);
app.use(
    express.json({
      limit: "2mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Uploaded files are served publicly (UploadPublicFile returns public URLs).
  app.use("/api/ai", aiRoutes);
app.use(
    "/uploads",
    express.static(path.resolve(config.uploadDir), { fallthrough: false, maxAge: "30d", immutable: true })
  );

  app.get("/api/health", (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

  app.use("/api/ai", aiRoutes);
app.use("/api/auth", authRouter);
  app.use("/api/ai", aiRoutes);
app.use("/api/entities", entitiesRouter);
  app.use("/api/ai", aiRoutes);
app.use("/api/uploads", uploadsRouter);
  app.use("/api/ai", aiRoutes);
app.use("/api/games", gamesRouter);
  app.use("/api/ai", aiRoutes);
app.use("/api/rewards", rewardsRouter);
  app.use("/api/ai", aiRoutes);
app.use("/api/listings", listingsRouter);
  app.use("/api/ai", aiRoutes);
app.use("/api/assistant", assistantRouter);
  app.use("/api/ai", aiRoutes);
app.use("/api/stripe", stripeRouter);
  app.use("/api/ai", aiRoutes);
app.use("/api/social", socialRouter);
  app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRouter);

  app.use("/api/ai", aiRoutes);
app.use(notFoundHandler);
  app.use("/api/ai", aiRoutes);
app.use(errorHandler);

  return app;
}
