import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 30 });

export const cacheMiddleware = (req, res, next) => {
  const key = `${req.method}:${req.originalUrl}`;

  const cached = cache.get(key);
  if (cached) {
    return res.json(cached);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const safeBody =
      body && typeof body === "object"
        ? JSON.parse(JSON.stringify(body))
        : body;

    cache.set(key, safeBody);
    return originalJson(safeBody);
  };

  next();
};

// 🔑 ADD THIS EXPORT (fixes your error)
export const invalidateCache = (pattern = "") => {
  const keys = cache.keys();
  keys.forEach((key) => {
    if (!pattern || key.includes(pattern)) {
      cache.del(key);
    }
  });
};
