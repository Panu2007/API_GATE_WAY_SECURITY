import bcrypt from "bcryptjs";
import crypto from "crypto";

export const generateApiKey = () => crypto.randomBytes(24).toString("hex");

export const hashValue = async (value) => bcrypt.hash(value, 10);

export const compareHash = async (value, hash) => bcrypt.compare(value, hash);
