import type { CellDetail, CellDetailMap, RiskLevel } from "../lib/types";
import {
  LEVEL_STYLE,
  casualty,
  int,
  levelColor,
  risk2,
  topAccidentTypes,
} from "../lib/format";

export function RankingTable({
  cellDetails,
  levelOf,
  selectedGridId,
  onSelectByGridId,
  topN = 8,
}: {
  cellDetails: CellDetailMap;
  levelOf: Map<string, RiskLevel>;
  selectedGridId: string | null;
  onSelectByGridId: (gridId: string) => void;
  topN?: number;
}) {
  const rows = Object.values(cellDetails)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, topN);

  return (
    <section className="panel">
      <div className="ph">
        <h2>주의 해역 순위</h2>
        <span className="hint">0.10° 격자 · 위험도 상위</span>
      </div>
      <table className="t">
        <thead>
          <tr>
            <th style={{ width: 54 }}>순위</th>
            <th>해역</th>
            <th>위험도</th>
            <th>주요 사고 유형</th>
            <th className="r">최근접 관측소</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const level = levelOf.get(c.grid_id) ?? "mid";
            const st = LEVEL_STYLE[level];
            const sel = c.grid_id === selectedGridId;
            return (
              <tr
                key={c.grid_id}
                className={`clickable${sel ? " sel" : ""}`}
                tabIndex={0}
                role="button"
                aria-label={`${c.sea_area} 격자 선택`}
                onClick={() => onSelectByGridId(c.grid_id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectByGridId(c.grid_id);
                  }
                }}
              >
                <td>
                  <span className={`rk${c.rank <= 3 ? " hot" : ""}`}>{c.rank}</span>
                </td>
                <td>{c.sea_area}</td>
                <td>
                  <span className="rsq" style={{ background: levelColor(level) }} />
                  <b className="num">{risk2(c.risk)}</b>{" "}
                  <span className="lv" style={{ background: st.bg, color: st.on }}>
                    {st.label}
                  </span>
                </td>
                <td>{topAccidentTypes(c.past)}</td>
                <td className="r num">{c.dist_km.toFixed(0)} km</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function PastAccidents({ detail }: { detail: CellDetail | null }) {
  const past = detail?.past ?? [];
  const sorted = [...past].sort((a, b) => b.year - a.year);
  const totalCas = past.reduce((s, p) => s + p.casualties, 0);

  return (
    <section className="panel">
      <div className="ph">
        <h2>선택 격자 · 과거 사고</h2>
        <span className="hint">{detail ? detail.sea_area : "0.10° 격자에서 제공"}</span>
      </div>
      {detail && sorted.length > 0 ? (
        <table className="t hist">
          <thead>
            <tr>
              <th>연도</th>
              <th>사고 유형</th>
              <th>선박 용도</th>
              <th className="r">인명피해</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={`${p.year}-${i}`}>
                <td className="num">{p.year}</td>
                <td>{p.accident_type}</td>
                <td>{p.vessel_use}</td>
                <td className="r">{casualty(p.casualties)}</td>
              </tr>
            ))}
            <tr className="sum">
              <td colSpan={3}>합계 ({int(past.length)}건)</td>
              <td className="r num">{totalCas > 0 ? `${totalCas}명` : "—"}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div className="empty">
          {detail
            ? "이 격자에는 기록된 과거 사고가 없습니다."
            : "0.10° 격자를 선택하면 해당 격자의 과거 사고 내역이 표시됩니다."}
        </div>
      )}
    </section>
  );
}
