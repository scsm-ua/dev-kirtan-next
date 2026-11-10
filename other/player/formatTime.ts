/** Seconds → `m:ss` (or `h:mm:ss`). */
export function formatTime(seconds: number | null): string {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return '--:--';

  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');

  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
