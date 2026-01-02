import { BlockedIP } from "../models/BlockedIP.js";
import { Log } from "../models/Log.js";

const patterns = [
  { name: "sql_injection", regex: /(\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bUPDATE\b|['"`]\s*or\s*['"`])/i },
  { name: "xss", regex: /(<script\b|onerror=|onload=|alert\(|<img\b)/i },
  { name: "command_injection", regex: /(;|\|\||&&|\bexec\b|\bbash\b|\bsh\b)/i },
];

const burstMap = new Map();
const burstWindowMs = 10 * 1000;
const burstThreshold = 50;

export const threatDetection = async (req, res, next) => {
  const payload = JSON.stringify(req.body || {}) + JSON.stringify(req.query || {});
  const target = `${req.originalUrl} ${payload}`;
  for (const rule of patterns) {
    if (rule.regex.test(target)) {
      await flagThreat(req, rule.name, payload);
      return res.status(403).json({ message: "Malicious pattern detected" });
    }
  }

  const burst = trackBurst(req.ip);
  if (burst.count > burstThreshold) {
    await flagThreat(req, "abnormal_frequency", { count: burst.count });
    return res.status(429).json({ message: "Too many requests detected" });
  }

  return next();
};

const trackBurst = (ip) => {
  const now = Date.now();
  const record = burstMap.get(ip) || { count: 0, windowStart: now };
  if (now - record.windowStart > burstWindowMs) {
    record.count = 0;
    record.windowStart = now;
  }
  record.count += 1;
  burstMap.set(ip, record);
  return record;
};

const flagThreat = async (req, reason, details) => {
  try {
    await BlockedIP.findOneAndUpdate(
      { ip: req.ip },
      { blocked: true, reason, geo: req.context?.geo },
      { upsert: true }
    );
    await Log.create({
      type: "threat",
      message: `Threat detected: ${reason}`,
      ip: req.ip,
      apiKey: req.context?.apiKeyId,
      method: req.method,
      path: req.originalUrl,
      riskLevel: "HIGH",
      riskScore: 95,
      geo: req.context?.geo,
      details,
    });
  } catch (err) {
    console.error("Threat logging failed", err);
  }
};
