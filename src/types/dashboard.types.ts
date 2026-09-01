// GET /dashboard/situation — ringkasan situasi satuan untuk Home Komandan.
// Lihat documentation/API_CONTRACT.md §2.1.

export interface SituationSummaryItem {
  key: string;
  label: string;
  count: number;
  percent: number;
}

export interface DashboardSituation {
  as_of: string;
  total_personnel: number;
  summary: SituationSummaryItem[];
  status_distribution: SituationSummaryItem[];
  active_alerts: number;
}
