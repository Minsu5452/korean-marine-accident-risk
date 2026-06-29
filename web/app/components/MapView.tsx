"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GridCell, Resolution } from "../lib/types";
import { RAMP } from "../lib/format";

interface MapViewProps {
  resolution: Resolution;
  cells: GridCell[];
  selectedGridId: string | null;
  onSelect: (cell: GridCell) => void;
  flyToken: number; // 외부(순위 클릭)에서 이동을 트리거
}

// OpenFreeMap positron — 키 불필요, 라이트 베이스맵
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
// 한반도 연안 (대략 lon 124~132, lat 32~39)
const BOUNDS: [[number, number], [number, number]] = [
  [123.6, 32.2],
  [132.2, 39.2],
];

function toGeoJSON(cells: GridCell[], res: number) {
  const h = res / 2;
  return {
    type: "FeatureCollection" as const,
    features: cells.map((c, i) => ({
      type: "Feature" as const,
      id: i,
      properties: {
        grid_id: c.grid_id,
        risk: c.risk,
        level: c.level,
        pct: c.pct,
        accidents: c.accidents,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [c.lon - h, c.lat - h],
            [c.lon + h, c.lat - h],
            [c.lon + h, c.lat + h],
            [c.lon - h, c.lat + h],
            [c.lon - h, c.lat - h],
          ],
        ],
      },
    })),
  };
}

export default function MapView({
  resolution,
  cells,
  selectedGridId,
  onSelect,
  flyToken,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  // maplibre 경계는 동적 import → SSR/정적 export에서 window 참조 회피, 타입은 느슨하게
  const mapRef = useRef<any>(null);
  const readyRef = useRef(false);

  // 핸들러가 항상 최신 props를 보도록 ref 미러링
  const cellsRef = useRef(cells);
  const resRef = useRef(resolution);
  const onSelectRef = useRef(onSelect);
  const idByGridRef = useRef<Map<string, number>>(new Map());
  const cellByGridRef = useRef<Map<string, GridCell>>(new Map());
  const hoveredRef = useRef<number | null>(null);
  const selectedFidRef = useRef<number | null>(null);
  const lastFlyRef = useRef<number>(flyToken);

  cellsRef.current = cells;
  resRef.current = resolution;
  onSelectRef.current = onSelect;

  function rebuildIndex(list: GridCell[]) {
    const ids = new Map<string, number>();
    const byGrid = new Map<string, GridCell>();
    list.forEach((c, i) => {
      ids.set(c.grid_id, i);
      byGrid.set(c.grid_id, c);
    });
    idByGridRef.current = ids;
    cellByGridRef.current = byGrid;
  }

  function applySelection(map: any, gridId: string | null) {
    const prev = selectedFidRef.current;
    if (prev !== null) {
      map.setFeatureState({ source: "grid", id: prev }, { selected: false });
    }
    if (gridId && idByGridRef.current.has(gridId)) {
      const fid = idByGridRef.current.get(gridId)!;
      map.setFeatureState({ source: "grid", id: fid }, { selected: true });
      selectedFidRef.current = fid;
    } else {
      selectedFidRef.current = null;
    }
  }

  // ── 초기화 (1회) ──
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    let cancelled = false;
    let map: any = null;

    (async () => {
      const maplibregl: any = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current) return;

      const wide = window.innerWidth > 1040;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        bounds: BOUNDS,
        fitBoundsOptions: {
          padding: wide
            ? { top: 70, left: 300, right: 360, bottom: 60 }
            : { top: 28, left: 20, right: 20, bottom: 28 },
        },
        minZoom: 4.5,
        maxZoom: 11,
        maxBounds: [
          [120, 29],
          [135, 42],
        ],
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      mapRef.current = map;
      map.touchZoomRotate?.disableRotation();

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );
      map.addControl(
        new maplibregl.ScaleControl({ maxWidth: 90, unit: "metric" }),
        "bottom-left",
      );

      map.on("load", () => {
        if (cancelled) return;
        rebuildIndex(cellsRef.current);
        map.addSource("grid", {
          type: "geojson",
          data: toGeoJSON(cellsRef.current, parseFloat(resRef.current)),
        });

        map.addLayer({
          id: "grid-fill",
          type: "fill",
          source: "grid",
          paint: {
            "fill-color": [
              "match",
              ["get", "level"],
              "veryhigh", RAMP[4],
              "high", RAMP[3],
              "mid", RAMP[2],
              "low", RAMP[1],
              "verylow", RAMP[0],
              RAMP[0],
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false], 0.85,
              ["boolean", ["feature-state", "hover"], false], 0.72,
              0.62,
            ],
          },
        });
        map.addLayer({
          id: "grid-line",
          type: "line",
          source: "grid",
          paint: {
            "line-color": "rgba(255,255,255,0.35)",
            "line-width": 0.4,
          },
        });
        map.addLayer({
          id: "grid-sel-casing",
          type: "line",
          source: "grid",
          paint: {
            "line-color": "#ffffff",
            "line-width": [
              "case",
              ["boolean", ["feature-state", "selected"], false], 4,
              0,
            ],
          },
        });
        map.addLayer({
          id: "grid-sel",
          type: "line",
          source: "grid",
          paint: {
            "line-color": "#34429e",
            "line-width": [
              "case",
              ["boolean", ["feature-state", "selected"], false], 2.2,
              0,
            ],
          },
        });

        // 호버
        map.on("mousemove", "grid-fill", (e: any) => {
          if (!e.features?.length) return;
          map.getCanvas().style.cursor = "pointer";
          const fid = e.features[0].id as number;
          if (hoveredRef.current === fid) return;
          if (hoveredRef.current !== null) {
            map.setFeatureState(
              { source: "grid", id: hoveredRef.current },
              { hover: false },
            );
          }
          hoveredRef.current = fid;
          map.setFeatureState({ source: "grid", id: fid }, { hover: true });
        });
        map.on("mouseleave", "grid-fill", () => {
          map.getCanvas().style.cursor = "";
          if (hoveredRef.current !== null) {
            map.setFeatureState(
              { source: "grid", id: hoveredRef.current },
              { hover: false },
            );
            hoveredRef.current = null;
          }
        });
        // 클릭 → 셀 선택
        map.on("click", "grid-fill", (e: any) => {
          const gid = e.features?.[0]?.properties?.grid_id as string | undefined;
          if (!gid) return;
          const cell = cellByGridRef.current.get(gid);
          if (cell) onSelectRef.current(cell);
        });

        readyRef.current = true;
        setLoaded(true);
        // 마운트 시 이미 선택된 셀이 있으면 반영
        applySelection(map, selectedGridId);
      });
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // 초기화는 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 격자/해상도 변경 → 소스 데이터 교체 ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource("grid");
    if (!src) return;
    // setData는 feature-state를 비우지 않으므로(같은 숫자 id에 선택/호버가 잔류)
    // 격자 교체 전에 소스의 모든 상태를 초기화한다
    map.removeFeatureState({ source: "grid" });
    hoveredRef.current = null;
    selectedFidRef.current = null;
    rebuildIndex(cells);
    src.setData(toGeoJSON(cells, parseFloat(resolution)));
    // 새 데이터에 대해 선택 상태 재적용
    applySelection(map, selectedGridId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, resolution]);

  // ── 선택 셀 변경 → 외곽선 (이동은 flyToken 변경 시에만: 순위 클릭) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    applySelection(map, selectedGridId);
    if (flyToken !== lastFlyRef.current) {
      lastFlyRef.current = flyToken;
      if (selectedGridId) {
        const cell = cellByGridRef.current.get(selectedGridId);
        if (cell) {
          const z = Math.max(map.getZoom(), 7.2);
          map.easeTo({ center: [cell.lon, cell.lat], zoom: z, duration: 650 });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGridId, flyToken]);

  return (
    <div ref={containerRef} className="maproot" aria-label="연안 격자 위험도 지도">
      {!loaded && (
        <div className="maploading">
          <span className="spin" aria-hidden="true" />
          베이스맵 불러오는 중…
        </div>
      )}
    </div>
  );
}
