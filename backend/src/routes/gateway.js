import express from "express";
import { invalidateCache } from "../middleware/cache.js";
import { Log } from "../models/Log.js";

const router = express.Router();

// Example backend service stubs to demonstrate routing via gateway.
router.get("/service-a/data", async (req, res) => {
  const payload = {
    service: "service-a",
    owner: req.context?.role,
    timestamp: new Date().toISOString(),
    message: "Fetched data through secured gateway",
  };
  return res.json(payload);
});

router.post("/service-a/data", async (req, res) => {
  invalidateCache("/service-a/data");
  return res.status(201).json({ message: "Data accepted by service-a", received: req.body });
});

router.get("/service-b/metrics", async (req, res) => {
  const payload = {
    service: "service-b",
    uptimeSeconds: process.uptime(),
    requestsToday: await Log.countDocuments({ type: "request" }),
  };
  return res.json(payload);
});

router.get("/public/ping", (req, res) => res.json({ status: "ok" }));

export default router;
