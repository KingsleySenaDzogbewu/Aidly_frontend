import { useEffect, useState } from 'react';
import { subscribeBusy, getBusyCount } from '../../api/busyStore';

// Thin progress bar across the top while any request is in flight. There's
// deliberately no "still working" text: the bar already shows activity, and the
// old banner covered page controls during slow server wake-ups.
export default function TopProgress() {
  const [count, setCount] = useState(getBusyCount());

  useEffect(() => subscribeBusy(setCount), []);

  if (count === 0) return null;

  return <div className="top-progress"><div className="top-progress-bar" /></div>;
}
