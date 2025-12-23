import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  env: process.env.APP_ENV || "development",
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/api-gateway-security",
  jwtSecret: process.env.JWT_SECRET || "change-this-secret",
  requestLimit: process.env.REQUEST_BODY_LIMIT || "200kb",
  globalRateLimit: Number(process.env.GLOBAL_RATE_LIMIT_PER_MINUTE || 200),
  routeRateLimit: Number(process.env.ROUTE_RATE_LIMIT_PER_MINUTE || 100),
  rateLimitBlockThreshold: Number(process.env.RATE_LIMIT_BLOCK_THRESHOLD || 3),
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 30),
  cacheMaxItems: Number(process.env.CACHE_MAX_ITEMS || 500),
  httpsEnabled: process.env.HTTPS_ENABLED === "true",
};
