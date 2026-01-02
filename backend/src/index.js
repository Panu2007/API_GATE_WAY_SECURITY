import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import { config } from "./config/env.js";

// ❌ TEMPORARILY DISABLED (Render crash causes)
// import { geoEnrichment } from "./middleware/geoEnrichment.js";
// import { ipFilter } from "./middleware/ipFilter.js";
// import { threatDetection } from "./middleware/threatDetection.js";
// import { riskScore } from "./middleware/riskScore.js";
// import { requestLogger } from "./middleware/requestLogger.js";

import { validateRequest } from "./middleware/validation.js";
import { authMiddleware, requireRole } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { cacheMiddleware } from "./middleware/cache.js";

import authRouter from "./routes/auth.js";
import gatewayRouter from "./routes/gateway.js";
import adminRouter from "./routes/admin.js";

/* =======================
   GLOBAL SAFETY GUARDS
======================= */
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

/* =======================
   APP SETUP
======================= */
const app = express();
app.set("trust proxy", true);

app.use(helmet());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(express.json({ limit: config.requestLimit }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

/* =======================
   HTTPS CHECK (OPTIONAL)
======================= */
if (config.httpsEnabled) {
  app.use((req, res, next) => {
    const proto = req.get("x-forwarded-proto");
    if (proto && proto !== "https") {
      return res.status(400).json({ message: "HTTPS required" });
    }
    next();
  });
}

/* =======================
   SAFE MIDDLEWARES ONLY
======================= */
app.use(validateRequest);

/* =======================
   ROUTES
======================= */
app.get("/health", (_req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

app.use("/auth", authRouter);

app.use(authMiddleware);
app.use(rateLimit);
app.use(cacheMiddleware);

app.use("/admin", requireRole("admin"), adminRouter);
app.use("/api", gatewayRouter);

/* =======================
   FALLBACKS
======================= */
app.use((req, res) =>
  res.status(404).json({ message: "Not found" })
);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal error" });
});

/* =======================
   START SERVER
======================= */
const start = async () => {
  await connectDB();

  const PORT = process.env.PORT || 4000;

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Gateway listening on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error("Startup failed:", err);
});
