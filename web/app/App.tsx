"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MapView from "./components/MapView";
import { FilterPanel, ResultPanel } from "./components/Panels";
import { PastAccidents, RankingTable } from "./components/Below";
import StatsExplorer from "./components/StatsExplorer";
import { Footer, Header, Hero, Kpi, Notice } from "./components/Chrome";
import { loadCore, loadGrid, primeGridCache, type CoreData } from "./lib/data";
import { RAMP } from "./lib/format";
import type { GridCell, Resolution, RiskLevel } from "./lib/types";

export default function App() {
  const [core, setCore] = useState<CoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<Resolution>("0.1");
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [selectedGridId, setSelectedGridId] = useState<string | null>(null);
  const [flyToken, setFlyToken] = useState(0);

  // ── 초기 로드: 메타·통계·XAI·모델 + 0.10° 격자/상세 ──
  useEffect(() => {
    let alive = true;
    loadCore()
      .then((data) => {
        if (!alive) return;
        primeGridCache("0.1", data.grid01);
        setGridCells(data.grid01.cells);
        // 기본 선택 = 위험도 1위 격자
        let r1: string | null = null;
        let best = Infinity;
        for (const [gid, d] of Object.entries(data.cellDetails)) {
          if (d.rank < best) {
            best = d.rank;
            r1 = gid;
          }
        }
        setSelectedGridId(r1);
        setCore(data);
      })
      .catch((e) => {
        if (alive) setError(e?.message ?? String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  const rank1Id = useMemo(() => {
    if (!core) return null;
    let id: string | null = null;
    let best = Infinity;
    for (const [gid, d] of Object.entries(core.cellDetails)) {
      if (d.rank < best) {
        best = d.rank;
        id = gid;
      }
    }
    return id;
  }, [core]);

  // grid_id → level (0.10° 격자 기준, 순위표 색/배지에 사용)
  const levelOf = useMemo(() => {
    const m = new Map<string, RiskLevel>();
    if (core) for (const c of core.grid01.cells) m.set(c.grid_id, c.level);
    return m;
  }, [core]);

  const selection = useMemo(() => {
    if (!core || !selectedGridId) return null;
    const grid = gridCells.find((c) => c.grid_id === selectedGridId) ?? null;
    if (!grid) return null;
    return { grid, detail: core.cellDetails[selectedGridId] ?? null };
  }, [core, gridCells, selectedGridId]);

  const handleResolution = useCallback(
    async (r: Resolution) => {
      if (r === resolution) return;
      setResolution(r);
      const data = await loadGrid(r);
      setGridCells(data.cells);
      const ids = new Set(data.cells.map((c) => c.grid_id));
      setSelectedGridId((prev) => {
        if (prev && ids.has(prev)) return prev;
        return r === "0.1" ? rank1Id : null;
      });
    },
    [resolution, rank1Id],
  );

  const handleMapSelect = useCallback((cell: GridCell) => {
    setSelectedGridId(cell.grid_id);
  }, []);

  // 순위표 클릭: 0.10°로 전환 후 해당 격자 선택 + 지도 이동
  const handleRankingSelect = useCallback(
    async (gridId: string) => {
      if (resolution !== "0.1") {
        setResolution("0.1");
        const data = await loadGrid("0.1");
        setGridCells(data.cells);
      }
      setSelectedGridId(gridId);
      setFlyToken((t) => t + 1);
    },
    [resolution],
  );

  if (error) {
    return (
      <div className="wrap" style={{ padding: "80px 28px" }}>
        <div className="empty">
          데이터를 불러오지 못했습니다.
          <br />
          <span style={{ fontSize: "12px" }}>{error}</span>
        </div>
      </div>
    );
  }

  if (!core) {
    return (
      <div className="wrap" style={{ padding: "120px 28px" }}>
        <div className="maploading" style={{ position: "static" }}>
          <span className="spin" aria-hidden="true" />
          분석 데이터 불러오는 중…
        </div>
      </div>
    );
  }

  const resLabel = parseFloat(resolution).toFixed(2);

  return (
    <>
      <Header period={core.meta.period} />
      <div className="wrap">
        <Hero />
        <Kpi meta={core.meta} resolution={resolution} />
        <Notice />

        <div className="stage">
          <MapView
            resolution={resolution}
            cells={gridCells}
            selectedGridId={selectedGridId}
            onSelect={handleMapSelect}
            flyToken={flyToken}
          />
          <div className="ttl">
            위험 히트맵 · <b>{resLabel}° 격자</b> · 색이 진할수록 위험 높음
          </div>
          <FilterPanel resolution={resolution} onResolution={handleResolution} />
          <ResultPanel selection={selection} resolution={resolution} />
          <div className="legendchip">
            <span className="grp">
              <span style={{ color: "var(--sub-2)" }}>낮음</span>
              <span className="scale">
                {RAMP.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <span style={{ color: "var(--sub-2)" }}>높음</span>
            </span>
            <span className="sep" />
            <span className="grp">
              <span className="selm" />
              선택 격자
            </span>
          </div>
        </div>

        <div className="below">
          <RankingTable
            cellDetails={core.cellDetails}
            levelOf={levelOf}
            selectedGridId={selectedGridId}
            onSelectByGridId={handleRankingSelect}
          />
          <PastAccidents detail={selection?.detail ?? null} />
        </div>

        <StatsExplorer stats={core.stats} xai={core.xai} model={core.model} />
      </div>
      <Footer />
    </>
  );
}
