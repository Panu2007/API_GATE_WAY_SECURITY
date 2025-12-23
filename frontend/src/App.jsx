import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import StatsCard from "./components/StatsCard.jsx";
import ListCard from "./components/ListCard.jsx";

const headers = import.meta.env.VITE_ADMIN_API_KEY
  ? { "x-api-key": import.meta.env.VITE_ADMIN_API_KEY }
  : {};

const client = axios.create({ headers });

const formatDate = (value) => new Date(value).toLocaleString();

export default function App() {
  const [analytics, setAnalytics] = useState({ totals: {}, topPaths: [], errorRates: [] });
  const [threatLogs, setThreatLogs] = useState([]);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [traffic, setTraffic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [analyticsRes, logsRes, blockedRes, keysRes, trafficRes] = await Promise.all([
        client.get("/admin/analytics"),
        client.get("/admin/logs", { params: { type: "threat" } }),
        client.get("/admin/blocked-ips"),
        client.get("/admin/api-keys"),
        client.get("/admin/traffic"),
      ]);
      setAnalytics(analyticsRes.data);
      setThreatLogs(logsRes.data.logs || []);
      setBlockedIPs(blockedRes.data.ips || []);
      setApiKeys(keysRes.data.keys || []);
      setTraffic(trafficRes.data.lastHour || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load data. Check API key and backend status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rateLimitStats = useMemo(
    () =>
      apiKeys.map((k) => ({
        label: k.label,
        status: k.status,
        rateLimitPerMinute: k.rateLimitPerMinute,
        role: k.role,
        user: k.user,
      })),
    [apiKeys]
  );

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-slate-300 text-sm">API Gateway Security</p>
          <h1 className="text-3xl font-semibold text-white">Admin Dashboard</h1>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-semibold"
        >
          Refresh
        </button>
      </header>

      {error && <div className="card border-rose-400/40 bg-rose-500/10 text-rose-100 mb-4">{error}</div>}
      {loading && <div className="text-slate-200 mb-4">Loading...</div>}

      <div className="grid md:grid-cols-4 gap-4">
        <StatsCard title="Requests" value={analytics.totals?.requests || 0} subtitle="All-time" />
        <StatsCard title="Threats" value={analytics.totals?.threats || 0} tone="danger" subtitle="Blocked & flagged" />
        <StatsCard
          title="Auth Failures"
          value={analytics.totals?.authFails || 0}
          tone="warn"
          subtitle="Unauthorized attempts"
        />
        <StatsCard
          title="Rate Limits"
          value={analytics.totals?.rateLimits || 0}
          tone="warn"
          subtitle="Limited in the last period"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Top APIs</h3>
          <div className="space-y-2">
            {(analytics.topPaths || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg">
                <span className="text-sm text-slate-200">{item._id}</span>
                <span className="text-xs text-cyan-300">{item.hits} hits</span>
              </div>
            ))}
            {(!analytics.topPaths || analytics.topPaths.length === 0) && (
              <div className="text-sm text-slate-400">No request data yet.</div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Error Rates</h3>
          <div className="space-y-2">
            {(analytics.errorRates || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg">
                <span className="text-sm text-slate-200">{item._id}</span>
                <span className="text-xs text-rose-300">{item.errors} errors</span>
              </div>
            ))}
            {(!analytics.errorRates || analytics.errorRates.length === 0) && (
              <div className="text-sm text-slate-400">No error data yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <ListCard
          title="Attack Logs"
          items={threatLogs}
          renderItem={(log) => (
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-rose-200 font-semibold">{log.message}</span>
                <span className="text-slate-400">{formatDate(log.createdAt)}</span>
              </div>
              <div className="text-xs text-slate-300 mt-1">IP: {log.ip}</div>
              <div className="text-xs text-slate-300">Path: {log.path}</div>
            </div>
          )}
        />

        <ListCard
          title="Blacklisted IPs"
          items={blockedIPs}
          renderItem={(ip) => (
            <div className="flex justify-between text-sm">
              <div>
                <div className="text-slate-200">{ip.ip}</div>
                <div className="text-xs text-slate-400">Reason: {ip.reason}</div>
              </div>
              <div className="text-xs text-slate-400">{formatDate(ip.createdAt)}</div>
            </div>
          )}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <ListCard
          title="Rate Limit Profiles"
          items={rateLimitStats}
          renderItem={(k) => (
            <div className="flex justify-between text-sm">
              <div>
                <div className="text-slate-200">{k.label}</div>
                <div className="text-xs text-slate-400">
                  {k.role} • {k.user}
                </div>
              </div>
              <div className="text-right">
                <div className="text-cyan-300 text-sm">{k.rateLimitPerMinute}/min</div>
                <div className="text-xs text-slate-400 uppercase">{k.status}</div>
              </div>
            </div>
          )}
        />

        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Traffic (last hour)</h3>
          <div className="grid grid-cols-2 gap-2">
            {traffic.map((t) => (
              <div key={t._id} className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
                <span className="text-xs text-slate-300">Min {t._id}</span>
                <span className="text-sm text-cyan-300">{t.count}</span>
              </div>
            ))}
            {traffic.length === 0 && <div className="text-sm text-slate-400">No traffic yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
