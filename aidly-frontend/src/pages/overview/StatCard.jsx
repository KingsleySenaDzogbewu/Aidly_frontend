import useCountUp from '../../hooks/useCountUp';

export default function StatCard({ label, value, icon: Icon, onClick, loading, color, index }) {
  const display = useCountUp(loading ? 0 : value);
  return (
    <button
      type="button"
      className={`stat-card fade-in-up ${loading ? 'stat-card-loading' : ''}`}
      style={{ '--stat-color': color, animationDelay: `${index * 70}ms` }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-icon">
          <Icon size={15} />
        </div>
      </div>
      <div className="stat-card-value">{loading ? '—' : display}</div>
    </button>
  );
}
