import { BlockedIP } from "../models/BlockedIP.js";
import { Log } from "../models/Log.js";

const cache = new Map();
const CACHE_TTL = 60 * 1000;

// NEVER block localhost / dev IPs
const TRUSTED_IPS = ["127.0.0.1", "::1", "localhost"];

export const ipFilter = async (req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress;

  // ✅ Allow trusted IPs always
  if (TRUSTED_IPS.includes(ip)) {
    return next();
  }

  const now = Date.now();
  const cached = cache.get(ip);
  if (cached && cached.expires > now) {
    if (cached.blocked) {
      return res.status(403).json({ message: "IP blocked" });
    }
    return next();
  }

  const record = await BlockedIP.findOne({ ip });

  const blocked =
    record?.mode === "block" &&
    record.blocked &&
    (!record.blockedUntil || record.blockedUntil > new Date());

  cache.set(ip, { blocked, expires: now + CACHE_TTL });

  if (blocked) {
    await logBlocked(ip, req, "blocked-entry");
    return res.status(403).json({ message: "IP blocked" });
  }

  return next();
};

const logBlocked = async (ip, req, reason) => {
  try {
    await Log.create({
      type: "auth_failed",
      message: "Blocked IP",
      details: { reason },
      ip,
      method: req.method,
      path: req.originalUrl,
    });
  } catch (err) {
    console.error("Failed to log blocked IP", err);
  }
};
