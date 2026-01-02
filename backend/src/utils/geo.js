const rangeMap = [
  { prefix: "10.", country: "Private", city: "RFC1918" },
  { prefix: "192.168.", country: "Private", city: "RFC1918" },
  { prefix: "172.16.", country: "Private", city: "RFC1918" },
  { prefix: "127.", country: "Local", city: "Loopback" },
  { prefix: "203.0.113.", country: "Test-Net", city: "Demo" },
  { prefix: "198.51.100.", country: "Test-Net", city: "Demo" },
  { prefix: "8.8.8.", country: "United States", city: "Mountain View" },
  { prefix: "1.1.1.", country: "Australia", city: "Sydney" },
];

export const normalizeIp = (ip) => {
  if (!ip) return "unknown";
  if (ip.includes("::ffff:")) return ip.split("::ffff:")[1];
  if (ip.includes(",")) return ip.split(",")[0].trim();
  return ip;
};

export const geoLookup = (ip) => {
  const cleanIp = normalizeIp(ip);
  const match = rangeMap.find((r) => cleanIp.startsWith(r.prefix));
  if (match) {
    return { country: match.country, city: match.city, source: "derived" };
  }
  const octet = Number(cleanIp.split(".")[0]);
  if (!Number.isNaN(octet)) {
    if (octet <= 49) return { country: "Asia-Pacific", city: "Edge", source: "derived" };
    if (octet <= 99) return { country: "Europe", city: "Edge", source: "derived" };
    if (octet <= 149) return { country: "North America", city: "Edge", source: "derived" };
    if (octet <= 199) return { country: "South America", city: "Edge", source: "derived" };
    return { country: "Africa", city: "Edge", source: "derived" };
  }
  return { country: "Unknown", city: "Unknown", source: "derived" };
};