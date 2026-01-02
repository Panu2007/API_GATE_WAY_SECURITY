import { geoLookup } from "../utils/geo.js";

export const geoEnrichment = (req, _res, next) => {
  const geo = geoLookup(req.ip || req.connection.remoteAddress);
  req.context = req.context || {};
  req.context.geo = geo;
  return next();
};