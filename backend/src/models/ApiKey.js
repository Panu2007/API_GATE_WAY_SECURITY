import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema(
  {
    label: { type: String, default: "default" },
    keyHash: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "client"], default: "client" },
    status: { type: String, enum: ["active", "blocked", "revoked"], default: "active" },
    rateLimitPerMinute: { type: Number, default: 200 },
    metadata: { type: Object },
  },
  { timestamps: true }
);

apiKeySchema.index({ status: 1 });

export const ApiKey = mongoose.model("ApiKey", apiKeySchema);
