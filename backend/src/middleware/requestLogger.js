import { Log } from "../models/Log.js";

export const requestLogger = async (req, res, next) => {
  const start = Date.now();
  res.on("finish", async () => {
    try {
      await Log.create({
        type: "request",
        message: "Request processed",
        ip: req.ip,
        apiKey: req.context?.apiKeyId,
        user: req.context?.userId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        userAgent: req.headers["user-agent"],
        details: {
          durationMs: Date.now() - start,
        },
      });
    } catch (err) {
      console.error("Failed to log request", err);
    }
  });
  next();
};
