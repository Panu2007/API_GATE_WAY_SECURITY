const ListCard = ({
  title,
  items,
  renderItem,
  scrollable = false,
  maxHeightClass = "max-h-[420px]",
  controls = null,
}) => {
  const containerClasses = scrollable
    ? `space-y-2 overflow-y-auto ${maxHeightClass} pr-2 scroll-smooth custom-scroll`
    : "space-y-2";

  return (
  <div className="card">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <span className="text-xs text-slate-400">{items.length} items</span>
    </div>
    {controls && <div className="mb-3">{controls}</div>}
    <div className={containerClasses}>
      {items.length === 0 && <div className="text-slate-400 text-sm">No records</div>}
      {items.map((item, idx) => (
        <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          {renderItem(item)}
        </div>
      ))}
    </div>
  </div>
  );
};

export default ListCard;
