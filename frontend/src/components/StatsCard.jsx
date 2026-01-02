const StatsCard = ({ title, value, subtitle, tone = "neutral", badge }) => {
  const toneClass =
    tone === "warn"
      ? "from-orange-400/40 to-orange-500/10 border-orange-400/40"
      : tone === "danger"
      ? "from-rose-500/50 to-rose-500/10 border-rose-400/40"
      : "from-cyan-400/40 to-cyan-500/10 border-cyan-400/40";
  return (
    <div className={`card bg-gradient-to-br ${toneClass}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm uppercase tracking-wide text-slate-300">{title}</div>
        {badge}
      </div>
      <div className="text-3xl font-semibold text-white mt-2">{value}</div>
      {subtitle && <div className="text-xs text-slate-300 mt-2">{subtitle}</div>}
    </div>
  );
};

export default StatsCard;
