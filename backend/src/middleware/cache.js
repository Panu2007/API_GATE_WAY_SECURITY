import NodeCache from "node-cache";
import { config } from "../config/env.js";

const cache = new NodeCache({ stdTTL: config.cacheTtlSeconds, maxKeys: config.cacheMaxItems });

export const cacheMiddleware = (req, res, next) => {
  if (req.method !== "GET") return next();
  const key = `${req.method}:${req.originalUrl}:${req.context?.apiKeyId || "anon"}`;
  const hit = cache.get(key);
  if (hit) {
    return res.json(hit);
  }
  const json = res.json.bind(res);
  res.json = (body) => {
    cache.set(key, body);
    return json(body);
  };
  return next();
};

export const invalidateCache = (pattern) => {
  const keys = cache.keys();
  keys.forEach((key) => {
    if (pattern === "*" || key.includes(pattern)) {
      cache.del(key);
    }
  });
};
