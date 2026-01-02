import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import StatsCard from "./components/StatsCard.jsx";
import ListCard from "./components/ListCard.jsx";
import Badge from "./components/Badge.jsx";

const headers = import.meta.env.VITE_ADMIN_API_KEY
  ? { "x-api-key": import.meta.env.VITE_ADMIN_API_KEY }
  : {};

const client = axios.create({ headers });

const formatDate = (value) => new Date(value).toLocaleString();

export default function App() {
  const [analytics, setAnalytics] = useState({ totals: {}, topPaths: [], errorRates: [], riskScores: [] });
  const [threatLogs, setThreatLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [traffic, setTraffic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [toasts, setToasts] = useState([]);
  const seenHighLogIds = useRef(new Set());
  const initializedHighs = useRef(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  const addHighToast = useCallback(
    (log, id) => {
      setToasts((prev) => {
        if (prev.some((t) => t.id === id)) return prev;
        return [
          ...prev,
          {
            id,
            message: log.message,
            ip: log.ip,
            path: log.path,
          },
        ];
      });

      // auto-dismiss
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [setToasts]
  );

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const [analyticsRes, logsRes, auditRes, blockedRes, keysRes, trafficRes] = await Promise.all([
          client.get("/admin/analytics"),
          client.get("/admin/logs", { params: { type: "threat" } }),
          client.get("/admin/logs", { params: { type: "audit" } }),
          client.get("/admin/blocked-ips"),
          client.get("/admin/api-keys"),
          client.get("/admin/traffic"),
        ]);
        setAnalytics(analyticsRes.data);
        setThreatLogs(logsRes.data.logs || []);
        setAuditLogs(auditRes.data.logs || []);
        setBlockedIPs(blockedRes.data.ips || []);
        setApiKeys(keysRes.data.keys || []);
        setTraffic(trafficRes.data.lastHour || []);
        setLastUpdated(new Date());

        const logs = logsRes.data.logs || [];
        const highLogs = logs.filter((l) => (l.riskLevel || "").toUpperCase() === "HIGH");
        if (!initializedHighs.current) {
          highLogs.forEach((log) => {
            const id = log._id || log.createdAt || log.message;
            if (id) seenHighLogIds.current.add(id);
          });
          initializedHighs.current = true;
        } else {
          highLogs.forEach((log) => {
            const id = log._id || log.createdAt || log.message;
            if (!id) return;
            if (!seenHighLogIds.current.has(id)) {
              seenHighLogIds.current.add(id);
              addHighToast(log, id);
            }
          });
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "Failed to load data. Check API key and backend status.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [addHighToast]
  );

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 10000);
    return () => clearInterval(interval);
  }, [load]);

  const rateLimitStats = useMemo(
    () =>
      apiKeys.map((k) => ({
        id: k.id,
        label: k.label,
        status: k.status,
        rateLimitPerMinute: k.rateLimitPerMinute,
        role: k.role,
        user: k.user,
      })),
    [apiKeys]
  );

  const filteredThreatLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return threatLogs.filter((log) => {
      const matchesRisk = riskFilter === "ALL" || (log.riskLevel || "UNKNOWN").toUpperCase() === riskFilter;
      const ip = log.ip?.toLowerCase() || "";
      const path = log.path?.toLowerCase() || "";
      const matchesSearch = term === "" || ip.includes(term) || path.includes(term);
      return matchesRisk && matchesSearch;
    });
  }, [threatLogs, searchTerm, riskFilter]);

  const handleBlockIp = async (ip) => {
    try {
      await client.post("/admin/blocked-ips/block", { ip });
      setActionMessage(`Blocked ${ip}`);
      load(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to block IP");
    }
  };

  const handleUnblockIp = async (ip) => {
    try {
      await client.post("/admin/blocked-ips/unblock", { ip });
      setActionMessage(`Unblocked ${ip}`);
      load(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to unblock IP");
    }
  };

  const handleRotateKey = async (id, label) => {
    try {
      const res = await client.post(`/admin/api-keys/${id}/rotate`);
      setActionMessage(`Rotated ${label}. New key: ${res.data.newKey}`);
      load(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to rotate key");
    }
  };

  const toggleLogExpand = (log) => {
    const id = log._id || log.createdAt || log.message;
    if (!id) return;
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast-alert pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border border-rose-300/40"
          >
            <div className="text-xs uppercase tracking-wide text-rose-50/80">High Severity Threat</div>
            <div className="text-sm font-semibold text-white">{toast.message}</div>
            <div className="text-xs text-rose-50/80">
              IP: {toast.ip || "Unknown"} — Path: {toast.path || "N/A"}
            </div>
          </div>
        ))}
      </div>
      <div className="min-h-screen p-6 max-w-6xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide">API Gateway Security</p>
            <h1 className="text-3xl font-semibold text-white">SOC Command Center</h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
              <div className="flex items-center gap-2">
                <span className="live-dot" />
                <Badge label="LIVE" />
              </div>
              {lastUpdated && <span>Updated: {formatDate(lastUpdated)}</span>}
            </div>
          </div>
          <button
            onClick={() => load()}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-semibold shadow-lg"
          >
            Refresh
          </button>
        </header>

        {error && <div className="card border-rose-400/40 bg-rose-500/10 text-rose-100">{error}</div>}
        {actionMessage && (
          <div className="card border-emerald-400/40 bg-emerald-500/10 text-emerald-100">{actionMessage}</div>
        )}
        {loading && <div className="text-slate-200">Loading...</div>}

        <div className="grid md:grid-cols-4 gap-4">
          <StatsCard title="Requests" value={analytics.totals?.requests || 0} subtitle="All-time" />
          <StatsCard
            title="Threats"
            value={analytics.totals?.threats || 0}
            tone="danger"
            subtitle="Blocked & flagged"
            badge={<Badge label="ACTIVE" />}
          />
          <StatsCard
            title="Auth Failures"
            value={analytics.totals?.authFails || 0}
            tone="warn"
            subtitle="Unauthorized attempts"
            badge={<Badge label="ERROR" />}
          />
          <StatsCard
            title="Rate Limits"
            value={analytics.totals?.rateLimits || 0}
            tone="warn"
            subtitle="Limited in the last period"
            badge={<Badge label="ACTIVE" />}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <ListCard
            title="Top APIs"
            items={analytics.topPaths || []}
            scrollable
            maxHeightClass="max-h-[260px]"
            renderItem={(item) => (
              <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg">
                <div className="text-sm text-slate-200">{item._id}</div>
                <div className="text-xs text-cyan-300">{item.hits} hits</div>
              </div>
            )}
          />

          <ListCard
            title="Error Rates"
            items={analytics.errorRates || []}
            scrollable
            maxHeightClass="max-h-[260px]"
            renderItem={(item) => (
              <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg">
                <span className="text-sm text-slate-200">{item._id}</span>
                <span className="text-xs text-rose-300">{item.errors} errors</span>
              </div>
            )}
          />

          <ListCard
            title="API Risk Scores"
            items={analytics.riskScores || []}
            scrollable
            maxHeightClass="max-h-[300px]"
            renderItem={(item) => (
              <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg">
                <div className="text-sm text-slate-200">{item._id}</div>
                <div className="flex items-center gap-2">
                  <Badge label={item.level || "LOW"} />
                  <span className="text-xs text-cyan-300">{Math.round(item.avgRisk)} score</span>
                </div>
              </div>
            )}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <ListCard
            title="Attack Logs"
            items={filteredThreatLogs}
            scrollable
            maxHeightClass="max-h-[420px]"
            controls={
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by IP or API path"
                  className="flex-1 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/70"
                />
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="w-full md:w-36 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/70"
                >
                  <option value="ALL">ALL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            }
            renderItem={(log) => {
              const id = log._id || log.createdAt || log.message;
              const isExpanded = expandedLogId === id;
              return (
                <button
                  type="button"
                  onClick={() => toggleLogExpand(log)}
                  className={`w-full text-left space-y-2 transition-colors ${
                    isExpanded ? "border border-cyan-400/40 bg-slate-900/70" : ""
                  }`}
                >
                  <div className="flex justify-between items-start text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`transition-transform duration-200 ${
                          isExpanded ? "rotate-90 text-cyan-300" : "text-slate-400"
                        }`}
                      >
                        ▶
                      </span>
                      <span className="text-rose-200 font-semibold">{log.message}</span>
                    </div>
                    <span className="text-slate-400">{formatDate(log.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Badge label={log.riskLevel || "HIGH"} />
                    <span>IP: {log.ip}</span>
                    {log.geo && <span>Aú {log.geo.country}</span>}
                  </div>
                  <div className="text-xs text-slate-300">Path: {log.path}</div>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-out ${
                      isExpanded ? "max-h-[500px] mt-2" : "max-h-0"
                    }`}
                  >
                    <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-3 space-y-1">
                      <div className="text-xs text-slate-200">
                        <span className="font-semibold text-slate-100">Risk:</span>{" "}
                        {log.riskLevel || "N/A"} {log.riskScore ? `(${log.riskScore})` : ""}
                      </div>
                      <div className="text-xs text-slate-200">
                        <span className="font-semibold text-slate-100">IP:</span> {log.ip || "Unknown"}
                      </div>
                      <div className="text-xs text-slate-200">
                        <span className="font-semibold text-slate-100">Path:</span> {log.path || "N/A"}
                      </div>
                      {log.geo && (
                        <div className="text-xs text-slate-200">
                          <span className="font-semibold text-slate-100">Geo:</span> {log.geo.country || "Unknown"}
                          {log.geo.city ? `, ${log.geo.city}` : ""}
                        </div>
                      )}
                      {log.details && (
                        <pre className="text-xs text-slate-100 bg-slate-950/60 border border-slate-800 rounded-lg p-3 whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </button>
              );
            }}
          />

          <ListCard
            title="Audit Trail"
            items={auditLogs}
            scrollable
            maxHeightClass="max-h-[420px]"
            renderItem={(log) => (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-200 font-semibold">{log.message}</span>
                  <span className="text-slate-400">{formatDate(log.createdAt)}</span>
                </div>
                <div className="text-xs text-slate-300">Path: {log.path}</div>
                {log.geo && <div className="text-xs text-slate-400">Origin: {log.geo.country}</div>}
              </div>
            )}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <ListCard
            title="Blacklisted IPs"
            items={blockedIPs}
            scrollable
            maxHeightClass="max-h-[320px]"
            renderItem={(ip) => (
              <div className="flex justify-between items-center text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200">{ip.ip}</span>
                    <Badge label={ip.blocked ? "BLOCKED" : "ACTIVE"} />
                  </div>
                  <div className="text-xs text-slate-400">Reason: {ip.reason}</div>
                  {ip.geo && (
                    <div className="text-xs text-slate-400">
                      Geo: {ip.geo.country} Aú {ip.geo.city}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 text-xs text-slate-300">
                  <button
                    onClick={() => handleBlockIp(ip.ip)}
                    className="px-3 py-1 rounded bg-rose-500/20 border border-rose-400/40 text-rose-100 hover:bg-rose-500/30"
                  >
                    Block
                  </button>
                  <button
                    onClick={() => handleUnblockIp(ip.ip)}
                    className="px-3 py-1 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/30"
                  >
                    Unblock
                  </button>
                </div>
              </div>
            )}
          />

          <ListCard
            title="API Keys"
            items={rateLimitStats}
            scrollable
            maxHeightClass="max-h-[300px]"
            renderItem={(k) => (
              <div className="flex justify-between items-center text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-slate-200">{k.label}</div>
                    <Badge label={k.status?.toUpperCase() || "ACTIVE"} />
                  </div>
                  <div className="text-xs text-slate-400">
                    {k.role} Aú {k.user}
                  </div>
                  <div className="text-xs text-cyan-300">{k.rateLimitPerMinute}/min</div>
                </div>
                <button
                  onClick={() => handleRotateKey(k.id, k.label)}
                  className="px-3 py-1 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/30 text-xs"
                >
                  Rotate
                </button>
              </div>
            )}
          />
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Traffic (last hour)</h3>
          <div className="grid md:grid-cols-4 grid-cols-2 gap-2">
            {traffic.map((t) => (
              <div key={t._id} className="bg-slate-900/60 p-3 rounded-lg flex items-center justify-between">
                <span className="text-xs text-slate-300">Min {t._id}</span>
                <span className="text-sm text-cyan-300">{t.count}</span>
              </div>
            ))}
            {traffic.length === 0 && <div className="text-sm text-slate-400">No traffic yet.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
