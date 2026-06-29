import type {
  CellDetailMap,
  GridData,
  Meta,
  Resolution,
  StatsData,
  XaiData,
} from "./types";

// 정적 export: 데이터는 public/demo → 루트 /demo 로 서빙되어 런타임 fetch
const BASE = "demo";

async function getJSON<T>(file: string): Promise<T> {
  const res = await fetch(`${BASE}/${file}`, { cache: "force-cache" });
  if (!res.ok) throw new Error(`${file} 로드 실패 (${res.status})`);
  return (await res.json()) as T;
}

export interface ModelData {
  has_lightgbm: boolean;
  by_resolution: Record<
    string,
    {
      n: number;
      positives: number;
      negatives: number;
      metrics: {
        logistic: { auc: number; pr_auc: number; brier: number };
        lightgbm?: { auc: number; pr_auc: number; brier: number };
      };
    }
  >;
}

export interface CoreData {
  meta: Meta;
  stats: StatsData;
  xai: XaiData;
  model: ModelData;
  cellDetails: CellDetailMap;
  grid01: GridData;
}

// 초기 로드: 메타·통계·XAI·모델 + 기본 0.10° 격자/상세를 한 번에
export async function loadCore(): Promise<CoreData> {
  const [meta, stats, xai, model, cellDetails, grid01] = await Promise.all([
    getJSON<Meta>("meta.json"),
    getJSON<StatsData>("stats.json"),
    getJSON<XaiData>("xai.json"),
    getJSON<ModelData>("model.json"),
    getJSON<CellDetailMap>("cells_0.1.json"),
    getJSON<GridData>("grid_0.1.json"),
  ]);
  return { meta, stats, xai, model, cellDetails, grid01 };
}

const gridCache = new Map<Resolution, GridData>();

// 해상도 토글 시 격자 교체 (캐시)
export async function loadGrid(res: Resolution): Promise<GridData> {
  const cached = gridCache.get(res);
  if (cached) return cached;
  const data = await getJSON<GridData>(`grid_${res}.json`);
  gridCache.set(res, data);
  return data;
}

export function primeGridCache(res: Resolution, data: GridData): void {
  gridCache.set(res, data);
}
