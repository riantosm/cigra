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

export interface PersonnelLocationPoint {
  id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  captured_at: string;
  source: string;
}

export interface PersonnelLocationOverviewItem {
  id: number;
  service_number: string;
  full_name: string;
  rank: string | null;
  unit: string | null;
  tenant_id: number;
  status: LocationStatus;
  location: PersonnelLocationPoint | null;
  last_seen: string | null;
}

export interface LocationsOverviewFilters {
  status: LocationStatus | null;
  unit_id: number | null;
}
