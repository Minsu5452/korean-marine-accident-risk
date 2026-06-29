// 데모 데이터 타입 — web/public/demo/*.json (실제 실행 캡처)

export type Resolution = "0.05" | "0.1" | "0.25";

export type RiskLevel = "veryhigh" | "high" | "mid" | "low" | "verylow";

export interface Meta {
  period: string;
  accidents: number;
  stations: number;
  resolutions: string[];
  high_risk_def: string;
  high_risk_count: Record<string, number>;
}

// grid_{res}.json 의 셀 (지도 히트맵 단위)
export interface GridCell {
  grid_id: string;
  lat: number;
  lon: number;
  risk: number;
  accidents: number;
  samples: number;
  pct: number;
  level: RiskLevel;
}

export interface GridData {
  resolution: number;
  cells: GridCell[];
}

export interface OddsRatio {
  feature: string;
  odds_ratio: number;
  ci_low: number;
  ci_high: number;
  pvalue: number;
}

export interface PastAccident {
  year: number;
  accident_type: string;
  vessel_use: string;
  casualties: number;
}

// cells_0.1.json 의 값 (0.10° 격자 상세)
export interface CellDetail {
  grid_id: string;
  risk: number;
  percentile: number;
  rank: number;
  total_cells: number;
  lat: number;
  lon: number;
  sea_area: string;
  nearest_station: string;
  dist_km: number;
  accidents: number;
  contributing_factors: OddsRatio[];
  past: PastAccident[];
}

export type CellDetailMap = Record<string, CellDetail>;

export interface StatResult {
  variable: string;
  n_pairs: number;
  test: string;
  effect_size: number;
  effect_name: string;
  pvalue: number;
  q_value: number;
  significant: boolean;
}

export interface StatsData {
  accidents: number;
  case_matched: number;
  control_matched: number;
  lag_days: number;
  fdr_alpha: number;
  results: StatResult[];
}

export interface PermImportance {
  feature: string;
  auc_drop: number;
}

export interface XaiData {
  resolution: number;
  n: number;
  odds_ratios: OddsRatio[];
  permutation_importance: PermImportance[];
}
