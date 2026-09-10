import type { WeatherForecastDay, WeatherPoint } from '@/types';

export interface DaySummary {
  label: string;
  date: string;
  minTemp: number | null;
  maxTemp: number | null;
  tempUnit: string;
  // Item paling "mewakili" harinya (mendekati siang) untuk ikon + deskripsi.
  representative: WeatherPoint | null;
}

// Jam lokal (0-23) dari `local_datetime` "YYYY-MM-DD HH:MM:SS".
function localHour(point: WeatherPoint): number {
  const timePart = point.local_datetime?.split(' ')[1] ?? point.time_label ?? '';
  const hour = Number(timePart.slice(0, 2));
  return Number.isFinite(hour) ? hour : 12;
}

export function summarizeForecastDay(day: WeatherForecastDay): DaySummary {
  const items = day.items ?? [];
  const temps = items.map(item => item.temp).filter(t => typeof t === 'number');

  let representative: WeatherPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const item of items) {
    const distance = Math.abs(localHour(item) - 12);
    if (distance < bestDistance) {
      bestDistance = distance;
      representative = item;
    }
  }

  return {
    label: day.day_label,
    date: day.date,
    minTemp: temps.length ? Math.min(...temps) : null,
    maxTemp: temps.length ? Math.max(...temps) : null,
    tempUnit: items[0]?.temp_unit ?? '°C',
    representative,
  };
}
