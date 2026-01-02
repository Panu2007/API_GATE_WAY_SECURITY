import { BlockedIP } from "../models/BlockedIP.js";
import { Log } from "../models/Log.js";
import { geoLookup, normalizeIp } from "../utils/geo.js";

const cache = new Map();
const CACHE_TTL = 60 * 1000;
let allowlistCache = { count: 0, expires: 0 };

// NEVER block localhost / dev IPs
const TRUSTED_IPS = ["127.0.0.1", "::1", "localhost"];

export const ipFilter = async (req, res, next) => {
  const ip = normalizeIp(
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || req.ip
  );
  const geo = geoLookup(ip);
  req.context = req.context || {};
  req.context.geo = req.context.geo || geo;

  // Allow trusted IPs always
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

  if (allowlistCache.expires < now) {
    allowlistCache = {
      count: await BlockedIP.countDocuments({ mode: "allow" }),
      expires: now + CACHE_TTL,
    };
  }

  const record = await BlockedIP.findOne({ ip });
  const isBlockedEntry =
    record?.mode === "block" && record.blocked && (!record.blockedUntil || record.blockedUntil > new Date());
  const blocked = isBlockedEntry || (allowlistCache.count > 0 && record?.mode !== "allow");

  cache.set(ip, { blocked, expires: now + CACHE_TTL });

  if (blocked) {
    await logBlocked(ip, req, record?.mode === "allow" ? "not-allowlisted" : "blocked-entry", geo);
    return res.status(403).json({ message: "IP blocked" });
  }

  return next();
};

const logBlocked = async (ip, req, reason, geo) => {
  try {
    await Log.create({
      type: "auth_failed",
      message: "Blocked IP",
      details: { reason },
      ip,
      method: req.method,
      path: req.originalUrl,
      geo,
    });
  } catch (err) {
    console.error("Failed to log blocked IP", err);
  }
};
