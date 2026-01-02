const riskRules = [
  { pattern: /\/admin/i, base: 90, level: "HIGH" },
  { pattern: /\/auth\/login/i, base: 70, level: "HIGH" },
  { pattern: /\/api\/service-b/i, base: 60, level: "MEDIUM" },
  { pattern: /\/api\/service-a/i, base: 40, level: "MEDIUM" },
];

export const riskScore = (req, _res, next) => {
  const path = req.originalUrl || req.url;
  let score = 10;
  let level = "LOW";

  for (const rule of riskRules) {
    if (rule.pattern.test(path)) {
      score = Math.max(score, rule.base);
      level = rule.level;
      break;
    }
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    score = Math.min(100, score + 10);
    if (score >= 80) level = "HIGH";
    else if (score >= 50) level = "MEDIUM";
  }

  req.context = req.context || {};
  req.context.risk = { score, level };
  return next();
};
