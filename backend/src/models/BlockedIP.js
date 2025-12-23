import mongoose from "mongoose";

const blockedIPSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true, unique: true },
    reason: { type: String, default: "manual" },
    mode: { type: String, enum: ["block", "allow"], default: "block" },
    blocked: { type: Boolean, default: true },
    blockedUntil: { type: Date },
  },
  { timestamps: true }
);

blockedIPSchema.index({ blocked: 1 });

export const BlockedIP = mongoose.model("BlockedIP", blockedIPSchema);
