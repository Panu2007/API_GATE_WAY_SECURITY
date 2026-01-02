import jwt from "jsonwebtoken";
import { ApiKey } from "../models/ApiKey.js";
import { User } from "../models/User.js";
import { compareHash } from "../utils/crypto.js";
import { Log } from "../models/Log.js";
import { config } from "../config/env.js";

const unauthorized = (res, reason = "Unauthorized") => res.status(401).json({ message: reason });

export const authMiddleware = async (req, res, next) => {
  req.context = req.context || {};
  const apiKeyHeader = req.headers["x-api-key"];
  const authHeader = req.headers.authorization;

  try {
    if (apiKeyHeader) {
      const apiKeys = await ApiKey.find({ status: "active" });
      const matchedKey = await findMatchingApiKey(apiKeyHeader, apiKeys);
      if (!matchedKey) {
        await logAuthFailure(req, "Invalid API key");
        return unauthorized(res, "Invalid API key");
      }
      req.context.apiKeyId = matchedKey._id;
      req.context.userId = matchedKey.user;
      req.context.role = matchedKey.role;
      req.context.rateLimit = matchedKey.rateLimitPerMinute;
      return next();
    }

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const payload = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(payload.sub);
      if (!user) {
        await logAuthFailure(req, "User not found");
        return unauthorized(res);
      }
      req.context.userId = user._id;
      req.context.role = user.role;
      return next();
    }

    await logAuthFailure(req, "Missing credentials");
    return unauthorized(res, "Missing authentication");
  } catch (err) {
    console.error("Auth error", err);
    await logAuthFailure(req, "Auth error");
    return unauthorized(res, "Authentication error");
  }
};

export const requireRole = (roles = []) => (req, res, next) => {
  const roleList = Array.isArray(roles) ? roles : [roles];
  if (!req.context?.role || !roleList.includes(req.context.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};

const findMatchingApiKey = async (incomingKey, apiKeys) => {
  for (const apiKey of apiKeys) {
    if (await compareHash(incomingKey, apiKey.keyHash)) {
      return apiKey;
    }
  }
  return null;
};

const logAuthFailure = async (req, message) => {
  try {
    await Log.create({
      type: "auth_failed",
      message,
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      userAgent: req.headers["user-agent"],
      geo: req.context?.geo || undefined,
    });
  } catch (err) {
    console.error("Failed to log auth failure", err);
  }
};
