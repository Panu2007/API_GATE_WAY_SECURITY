import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import { config } from "./config/env.js";

const app = express();
app.set("trust proxy", true);

app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(morgan("combined"));

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ❗ IMPORTANT: keep server alive
const start = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    const PORT = process.env.PORT || 4000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Gateway listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error", err);
  }
};

start();
