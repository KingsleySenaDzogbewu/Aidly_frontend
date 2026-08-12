export function SkeletonRow({ small, index = 0 }) {
  return <div className={`skeleton skeleton-row-enter ${small ? 'skeleton-row-sm' : 'skeleton-row'}`} style={{ animationDelay: `${index * 70}ms` }} />;
}

export function SkeletonLine({ width = '100%' }) {
  return <div className="skeleton skeleton-line" style={{ width }} />;
}

export default function SkeletonList({ count = 3, small }) {
  return (
    <div className="skeleton-stack">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} small={small} index={i} />
      ))}
    </div>
  );
}
