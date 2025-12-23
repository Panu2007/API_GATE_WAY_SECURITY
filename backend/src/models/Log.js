import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["request", "auth_failed", "rate_limit", "threat", "system"], default: "request" },
    message: { type: String },
    ip: { type: String },
    apiKey: { type: mongoose.Schema.Types.ObjectId, ref: "ApiKey" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    method: { type: String },
    path: { type: String },
    statusCode: { type: Number },
    userAgent: { type: String },
    details: { type: Object },
  },
  { timestamps: true }
);

logSchema.index({ createdAt: -1 });
logSchema.index({ type: 1 });

export const Log = mongoose.model("Log", logSchema);
