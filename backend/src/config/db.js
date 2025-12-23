import mongoose from "mongoose";
import { config } from "./env.js";

export const connectDB = async () => {
  const opts = {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
  };
  await mongoose.connect(config.mongoUri, opts);
  return mongoose.connection;
};
