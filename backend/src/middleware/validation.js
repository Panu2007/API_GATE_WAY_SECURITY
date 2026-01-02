export const validateRequest = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";

  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    if (!contentType.includes("application/json")) {
      return res.status(400).json({
        message: "Content-Type must be application/json",
      });
    }

    if (req.body && typeof req.body !== "object") {
      return res.status(400).json({
        message: "Invalid JSON body",
      });
    }
  }

  // ❌ DO NOT block proxy headers (Render needs them)
  const forbiddenHeaders = [
    "x-http-method-override"
  ];

  for (const header of forbiddenHeaders) {
    if (req.headers[header]) {
      return res.status(400).json({
        message: `Header ${header} is not allowed`,
      });
    }
  }

  next();
};
