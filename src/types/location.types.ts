export interface SendLocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  captured_at?: string;
  source?: string;
}

export type LocationStatus = 'fresh' | 'stale' | 'offline';

export interface LocationHistoryEntry {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  captured_at?: string;
  source?: string;
}

export interface MyLocationResult {
  profile: unknown;
  location: LocationHistoryEntry | null;
  status: LocationStatus;
  history: LocationHistoryEntry[];
}
