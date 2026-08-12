import './motion.css';

// A small decorative "journey" motif: a dashed road with a car travelling
// along it. Reuses the same hand-drawn line style as the app's icon set
// (24x24, stroke=currentColor) so it reads as part of the product rather
// than a mismatched imported graphic.
//
// Two modes:
// - progress (0-100 supplied): the car sits at that point on the road and
//   idles there — used to represent real, measured progress (license
//   stages), not a decorative loop.
// - no progress supplied: the car drives the full road on a slow loop —
//   purely decorative (login hero).
const PATH_D = 'M4 55 C 70 8, 130 96, 200 46 S 300 12, 396 50';
const VIEW_W = 400;
const VIEW_H = 66;

export default function RoadMotif({ progress, color = 'currentColor', className = '', style }) {
  const hasProgress = typeof progress === 'number' && Number.isFinite(progress);
  const pinned = hasProgress ? Math.max(2, Math.min(98, progress)) : null;

  return (
    <div
      className={`road-motif ${hasProgress ? 'road-motif-pinned' : 'road-motif-loop'} ${className}`}
      style={style}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="100%" fill="none" preserveAspectRatio="none">
        <path d={PATH_D} stroke={color} strokeOpacity="0.32" strokeWidth="2.2" strokeDasharray="1 11" strokeLinecap="round" />
      </svg>
      <div
        className="road-motif-car"
        style={{
          offsetPath: `path('${PATH_D}')`,
          WebkitOffsetPath: `path('${PATH_D}')`,
          ...(hasProgress ? { offsetDistance: `${pinned}%`, WebkitOffsetDistance: `${pinned}%` } : {}),
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 16v-3.2L6.7 8a2 2 0 0 1 1.8-1.1h7a2 2 0 0 1 1.8 1.1l2.2 4.8V16" />
          <rect x="3" y="16" width="18" height="3.5" rx="1.3" />
          <circle cx="7.5" cy="19.5" r="1.4" />
          <circle cx="16.5" cy="19.5" r="1.4" />
        </svg>
      </div>
    </div>
  );
}
