import { ApiKey } from "../models/ApiKey.js";
import { BlockedIP } from "../models/BlockedIP.js";
import { Log } from "../models/Log.js";
import { config } from "../config/env.js";

const windowMs = 60 * 1000;
const perKeyMap = new Map();
const perRouteMap = new Map();

const touchCounter = (store, key, limit) => {
  const now = Date.now();
  const record = store.get(key) || { count: 0, resetAt: now + windowMs };
  if (record.resetAt < now) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }
  record.count += 1;
  record.limit = limit;
  store.set(key, record);
  return record;
};

export const rateLimit = async (req, res, next) => {
  const apiKeyId = req.context?.apiKeyId;
  const roleRateLimit = req.context?.rateLimit || config.globalRateLimit;
  const keyIdentifier = apiKeyId || req.context?.userId || req.ip;
  const perKeyRecord = touchCounter(perKeyMap, keyIdentifier, roleRateLimit);
  const routeKey = `${req.method}:${req.originalUrl}`;
  const perRouteRecord = touchCounter(perRouteMap, routeKey, config.routeRateLimit);

  const overKey = perKeyRecord.count > perKeyRecord.limit;
  const overRoute = perRouteRecord.count > perRouteRecord.limit;
  if (!overKey && !overRoute) {
    return next();
  }

  await Log.create({
    type: "rate_limit",
    message: overKey ? "Per key rate limit exceeded" : "Per route rate limit exceeded",
    ip: req.ip,
    apiKey: apiKeyId,
    method: req.method,
    path: req.originalUrl,
    geo: req.context?.geo,
    riskLevel: "MEDIUM",
    riskScore: 60,
    details: {
      perKey: perKeyRecord,
      perRoute: perRouteRecord,
    },
  });

  await maybeAutoBlock(req, perKeyRecord);
  return res.status(429).json({ message: "Rate limit exceeded" });
};

const maybeAutoBlock = async (req, counter) => {
  if (counter.count < counter.limit * config.rateLimitBlockThreshold) return;
  try {
    if (req.context?.apiKeyId) {
      await ApiKey.findByIdAndUpdate(req.context.apiKeyId, { status: "blocked" });
    }
    await BlockedIP.findOneAndUpdate(
      { ip: req.ip },
      { blocked: true, reason: "auto-rate-limit", geo: req.context?.geo },
      { upsert: true }
    );
    await Log.create({
      type: "threat",
      message: "Auto-blocked for abuse",
      ip: req.ip,
      apiKey: req.context?.apiKeyId,
      path: req.originalUrl,
      geo: req.context?.geo,
      riskLevel: "HIGH",
      riskScore: 90,
    });
  } catch (err) {
    console.error("Auto-block failed", err);
  }
};
