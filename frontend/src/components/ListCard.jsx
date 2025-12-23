const ListCard = ({ title, items, renderItem }) => (
  <div className="card">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <span className="text-xs text-slate-400">{items.length} items</span>
    </div>
    <div className="space-y-2">
      {items.length === 0 && <div className="text-slate-400 text-sm">No records</div>}
      {items.map((item, idx) => (
        <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          {renderItem(item)}
        </div>
      ))}
    </div>
  </div>
);

export default ListCard;
