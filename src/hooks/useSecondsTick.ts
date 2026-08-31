import { useEffect, useState } from 'react';

// Satu interval 1 detik dipakai bersama semua komponen yang butuh tick (mis. banyak
// LocationStatusBadge di daftar) — hemat dibanding satu setInterval per komponen. Interval baru
// hidup saat ada minimal satu subscriber, dan mati lagi begitu subscriber terakhir lepas.
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function startIntervalIfNeeded(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    listeners.forEach(listener => listener());
  }, 1000);
}

function stopIntervalIfIdle(): void {
  if (listeners.size === 0 && intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// Memaksa komponen re-render tiap 1 detik. Nilai kembaliannya (counter) biasanya tidak dipakai —
// cukup dipanggil agar komponen ikut ter-render ulang dan menghitung ulang waktu relatifnya.
// `enabled=false` melepas langganan sepenuhnya (tidak ada re-render) — dipakai mis. badge status
// "offline" yang tidak menampilkan waktu relatif, jadi tidak perlu ikut ter-tick tiap detik
// (penting di daftar panjang: puluhan badge yang tak perlu update = jank saat scroll).
export function useSecondsTick(enabled = true): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const listener = () => setTick(current => (current + 1) % 1_000_000);
    listeners.add(listener);
    startIntervalIfNeeded();
    return () => {
      listeners.delete(listener);
      stopIntervalIfIdle();
    };
  }, [enabled]);

  return tick;
}
