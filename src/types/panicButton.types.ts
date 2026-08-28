export interface PanicButtonPayload {
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
}

export interface PanicButtonResult {
  id: number;
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
  created_at?: string;
}
