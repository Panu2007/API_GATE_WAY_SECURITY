import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { ApiKey } from "../models/ApiKey.js";
import { BlockedIP } from "../models/BlockedIP.js";
import { Log } from "../models/Log.js";
import { generateApiKey, hashValue } from "../utils/crypto.js";
import { config } from "../config/env.js";
import bcrypt from "bcryptjs";

const seed = async () => {
  await connectDB();
  await Promise.all([User.deleteMany({}), ApiKey.deleteMany({}), BlockedIP.deleteMany({}), Log.deleteMany({})]);

  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const clientPassword = process.env.CLIENT_PASSWORD || "ClientPass123!";

  const admin = await User.create({
    email: process.env.ADMIN_EMAIL || "admin@example.com",
    passwordHash: await bcrypt.hash(adminPassword, 10),
    role: "admin",
  });
  const client = await User.create({
    email: process.env.CLIENT_EMAIL || "client@example.com",
    passwordHash: await bcrypt.hash(clientPassword, 10),
    role: "client",
  });

  const adminApiKey = generateApiKey();
  const clientApiKey = generateApiKey();

  await ApiKey.create([
    {
      label: "Admin key",
      keyHash: await hashValue(adminApiKey),
      user: admin._id,
      role: "admin",
      rateLimitPerMinute: config.globalRateLimit,
    },
    {
      label: "Client key",
      keyHash: await hashValue(clientApiKey),
      user: client._id,
      role: "client",
      rateLimitPerMinute: config.routeRateLimit,
    },
  ]);

  await BlockedIP.create([
    { ip: "203.0.113.10", reason: "demo-block", blocked: true, mode: "block" },
    { ip: "198.51.100.5", reason: "demo-allow", blocked: false, mode: "allow" },
  ]);

  await Log.create({
    type: "system",
    message: "Seed data created",
  });

  console.log("Seed completed");
  console.log("Admin credentials", admin.email, adminPassword);
  console.log("Client credentials", client.email, clientPassword);
  console.log("Admin API key:", adminApiKey);
  console.log("Client API key:", clientApiKey);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
