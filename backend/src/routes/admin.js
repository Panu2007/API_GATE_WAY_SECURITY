import express from "express";
import { Log } from "../models/Log.js";
import { ApiKey } from "../models/ApiKey.js";
import { BlockedIP } from "../models/BlockedIP.js";
import { generateApiKey, hashValue } from "../utils/crypto.js";
import { geoLookup, normalizeIp } from "../utils/geo.js";

const router = express.Router();

router.get("/analytics", async (_req, res) => {
  const [requests, threats, authFails, rateLimits, topPaths] = await Promise.all([
    Log.countDocuments({ type: "request" }),
    Log.countDocuments({ type: "threat" }),
    Log.countDocuments({ type: "auth_failed" }),
    Log.countDocuments({ type: "rate_limit" }),
    Log.aggregate([
      { $match: { type: "request" } },
      { $group: { _id: "$path", hits: { $sum: 1 } } },
      { $sort: { hits: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const errorRates = await Log.aggregate([
    { $match: { statusCode: { $gte: 400 } } },
    { $group: { _id: "$path", errors: { $sum: 1 } } },
    { $sort: { errors: -1 } },
    { $limit: 5 },
  ]);

  const riskScores = await Log.aggregate([
    { $match: { type: "request" } },
    {
      $group: {
        _id: "$path",
        avgRisk: { $avg: "$riskScore" },
        level: { $max: "$riskLevel" },
        hits: { $sum: 1 },
      },
    },
    { $sort: { avgRisk: -1 } },
    { $limit: 10 },
  ]);

  return res.json({
    totals: { requests, threats, authFails, rateLimits },
    topPaths,
    errorRates,
    riskScores,
  });
});

router.get("/logs", async (req, res) => {
  const { type } = req.query;
  const query = type ? { type } : {};
  const logs = await Log.find(query).sort({ createdAt: -1 }).limit(100);
  return res.json({ logs });
});

router.get("/blocked-ips", async (_req, res) => {
  const ips = await BlockedIP.find({ blocked: true }).sort({ createdAt: -1 });
  return res.json({ ips });
});

router.get("/api-keys", async (_req, res) => {
  const keys = await ApiKey.find().populate("user", "email role");
  return res.json({
    keys: keys.map((k) => ({
      id: k._id,
      label: k.label,
      user: k.user?.email,
      role: k.role,
      status: k.status,
      rateLimitPerMinute: k.rateLimitPerMinute,
      createdAt: k.createdAt,
    })),
  });
});

router.get("/traffic", async (_req, res) => {
  const lastHour = new Date(Date.now() - 60 * 60 * 1000);
  const data = await Log.aggregate([
    { $match: { createdAt: { $gte: lastHour }, type: "request" } },
    {
      $group: {
        _id: { $minute: "$createdAt" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return res.json({ lastHour: data });
});

router.post("/blocked-ips/block", async (req, res) => {
  const ip = normalizeIp(req.body.ip);
  if (!ip) return res.status(400).json({ message: "IP required" });
  const geo = geoLookup(ip);
  const record = await BlockedIP.findOneAndUpdate(
    { ip },
    { blocked: true, reason: req.body.reason || "manual", geo, mode: "block" },
    { upsert: true, new: true }
  );
  await logAudit(req, `Blocked IP ${ip}`, { ip, geo });
  return res.json({ ip: record });
});

router.post("/blocked-ips/unblock", async (req, res) => {
  const ip = normalizeIp(req.body.ip);
  if (!ip) return res.status(400).json({ message: "IP required" });
  const record = await BlockedIP.findOneAndUpdate(
    { ip },
    { blocked: false, reason: req.body.reason || "manual-unblock", mode: "block" },
    { new: true }
  );
  await logAudit(req, `Unblocked IP ${ip}`, { ip });
  return res.json({ ip: record });
});

router.post("/api-keys/:id/rotate", async (req, res) => {
  const keyId = req.params.id;
  const apiKey = await ApiKey.findById(keyId);
  if (!apiKey) return res.status(404).json({ message: "API key not found" });
  const newKey = generateApiKey();
  apiKey.keyHash = await hashValue(newKey);
  apiKey.status = "active";
  await apiKey.save();
  await logAudit(req, `Rotated API key ${apiKey.label}`, { apiKeyId: apiKey._id });
  return res.json({ newKey });
});

const logAudit = async (req, message, details) => {
  await Log.create({
    type: "audit",
    message,
    ip: req.ip,
    user: req.context?.userId,
    apiKey: req.context?.apiKeyId,
    method: req.method,
    path: req.originalUrl,
    geo: req.context?.geo,
    riskLevel: "MEDIUM",
    riskScore: 55,
    details,
  });
};

export default router;
