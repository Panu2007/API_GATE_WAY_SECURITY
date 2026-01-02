const toneMap = {
  ACTIVE: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
  BLOCKED: "bg-rose-500/20 text-rose-200 border-rose-400/40",
  ERROR: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  LIVE: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
  HIGH: "bg-rose-500/20 text-rose-200 border-rose-400/40",
  MEDIUM: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  LOW: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
};

const Badge = ({ label }) => {
  const key = label?.toUpperCase() || "ACTIVE";
  const tone = toneMap[key] || "bg-slate-700 text-slate-200 border-slate-500/40";
  return (
    <span className={`px-2 py-1 rounded-full text-[11px] border font-semibold tracking-wide ${tone}`}>
      {label}
    </span>
  );
};

export default Badge;
