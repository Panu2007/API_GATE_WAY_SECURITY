import express from "express";
import { Log } from "../models/Log.js";
import { ApiKey } from "../models/ApiKey.js";
import { BlockedIP } from "../models/BlockedIP.js";

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

  return res.json({
    totals: { requests, threats, authFails, rateLimits },
    topPaths,
    errorRates,
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
    { $sort: { "_id": 1 } },
  ]);
  return res.json({ lastHour: data });
});

export default router;
