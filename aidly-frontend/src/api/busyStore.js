// Minimal pub-sub so the axios layer (outside React) can drive a global
// "network busy" indicator without prop drilling.
let count = 0;
const listeners = new Set();

function emit() {
  listeners.forEach((l) => l(count));
}

export function busyStart() {
  count += 1;
  emit();
}

export function busyEnd() {
  count = Math.max(0, count - 1);
  emit();
}

export function subscribeBusy(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBusyCount() {
  return count;
}
