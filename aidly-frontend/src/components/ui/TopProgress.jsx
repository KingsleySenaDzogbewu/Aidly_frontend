import { useEffect, useState } from 'react';
import { subscribeBusy, getBusyCount } from '../../api/busyStore';

export default function TopProgress() {
  const [count, setCount] = useState(getBusyCount());
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => subscribeBusy(setCount), []);

  useEffect(() => {
    if (count === 0) { setShowSlowHint(false); return; }
    const t = setTimeout(() => setShowSlowHint(true), 3500);
    return () => clearTimeout(t);
  }, [count]);

  if (count === 0) return null;

  return (
    <>
      <div className="top-progress"><div className="top-progress-bar" /></div>
      {showSlowHint && (
        <div className="slow-hint">
          <span className="spinner" />
          Still working — the server is taking a bit longer than usual…
        </div>
      )}
    </>
  );
}
