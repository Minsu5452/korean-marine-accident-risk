"use client";

import { useState } from "react";
import type { ModelData } from "../lib/data";
import type { StatResult, StatsData, XaiData } from "../lib/types";
import {
  ci,
  effect3,
  int,
  or2,
  pval,
  qval,
  sigClass,
  sigLabel,
} from "../lib/format";

function magnitude(r: number): string {
  const a = Math.abs(r);
  if (a < 0.1) return "작음";
  if (a < 0.3) return "중간";
  if (a < 0.5) return "큼";
  return "매우 큼";
}

export default function StatsExplorer({
  stats,
  xai,
  model,
}: {
  stats: StatsData;
  xai: XaiData;
  model: ModelData;
}) {
  const [tab, setTab] = useState<"case" | "model">("case");
  const [varIdx, setVarIdx] = useState(0);

  return (
    <section className="panel stat">
      <div className="ph">
        <h2>통계 탐색 · 사고 시점 대조 분석</h2>
        <div className="tabs">
          <button className={tab === "case" ? "on" : ""} onClick={() => setTab("case")}>
            사고 시점 대조
          </button>
          <button className={tab === "model" ? "on" : ""} onClick={() => setTab("model")}>
            모델 기여도
          </button>
        </div>
      </div>
      {tab === "case" ? (
        <CaseView stats={stats} varIdx={varIdx} setVarIdx={setVarIdx} />
      ) : (
        <ModelView xai={xai} model={model} />
      )}
    </section>
  );
}

function CaseView({
  stats,
  varIdx,
  setVarIdx,
}: {
  stats: StatsData;
  varIdx: number;
  setVarIdx: (i: number) => void;
}) {
  const results = stats.results;
  const cur = results[varIdx];
  const maxAbs = Math.max(...results.map((r) => Math.abs(r.effect_size)), 1e-6);

  return (
    <div className="sg">
      <div className="ctl">
        <div className="l">분석 변수</div>
        <div className="varlist">
          {results.map((r, i) => (
            <button
              key={r.variable}
              className={`varitem${i === varIdx ? " on" : ""}`}
              onClick={() => setVarIdx(i)}
            >
              <span>{r.variable}</span>
              <span className="vm num">{effect3(r.effect_size)}</span>
            </button>
          ))}
        </div>
        <div className="meth">
          <b>case-crossover</b> · 같은 위치의 사고 시점과 {stats.lag_days}일 전 대조 시점을 짝지어
          비교합니다. 정규성 검정 결과에 따라 검정을 자동 선택하며, 여기서는 Wilcoxon 부호순위 검정이
          적용됐습니다. 다중 비교는 <b>FDR(BH) α={stats.fdr_alpha}</b>로 보정합니다. 사고{" "}
          {int(stats.accidents)}건 기준.
        </div>
      </div>

      <div className="view">
        <div className="summ">
          <b>{cur.variable}</b> — 사고·대조 {int(cur.n_pairs)}쌍을 Wilcoxon 부호순위 검정으로
          비교했습니다. 효과크기(rank-biserial) <b>{effect3(cur.effect_size)}</b> (|효과|{" "}
          {magnitude(cur.effect_size)}), {pval(cur.pvalue)} · FDR 보정 {qval(cur.q_value)} →{" "}
          <b>{cur.significant ? "통계적으로 유의" : "유의하지 않음"}</b>.
        </div>
        <div className="charts">
          <div>
            <h3>변수별 효과크기 (rank-biserial)</h3>
            <div className="csub">0 기준 좌우 · 색이 진하면 FDR 보정 후 유의</div>
            <div className="ebars">
              {results.map((r, i) => (
                <EffectBar
                  key={r.variable}
                  r={r}
                  maxAbs={maxAbs}
                  selected={i === varIdx}
                  onClick={() => setVarIdx(i)}
                />
              ))}
            </div>
          </div>
          <div>
            <h3>변수별 검정 결과</h3>
            <div className="csub">쌍수 · 효과크기 · 보정 q값 · 유의성</div>
            <table className="stab">
              <thead>
                <tr>
                  <th>변수</th>
                  <th className="r">쌍수</th>
                  <th className="r">효과크기</th>
                  <th className="r">q값</th>
                  <th className="r">유의성</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.variable} className={i === varIdx ? "sel" : ""}>
                    <td>{r.variable}</td>
                    <td className="r">{int(r.n_pairs)}</td>
                    <td className="r">{effect3(r.effect_size)}</td>
                    <td className="r">{r.q_value < 0.001 ? "<0.001" : r.q_value.toFixed(3)}</td>
                    <td className="r">
                      <span className={`sig ${sigClass(r.q_value)}`}>{sigLabel(r.q_value)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="note">
              효과크기는 rank-biserial 상관입니다. 유의성은 다중 비교(FDR, Benjamini-Hochberg) 보정 후
              q값 기준입니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EffectBar({
  r,
  maxAbs,
  selected,
  onClick,
}: {
  r: StatResult;
  maxAbs: number;
  selected: boolean;
  onClick: () => void;
}) {
  const w = (Math.abs(r.effect_size) / maxAbs) * 50;
  const pos = r.effect_size >= 0;
  const style = pos
    ? { left: "50%", width: `${w}%` }
    : { right: "50%", width: `${w}%` };
  return (
    <button
      className={`ebar${r.significant ? " sig" : ""}${selected ? " sel" : ""}`}
      onClick={onClick}
      style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%" }}
    >
      <div className="lab">
        <span className="nm">{r.variable}</span>
        <span className="num">{effect3(r.effect_size)}</span>
      </div>
      <div className="track">
        <span className="mid" />
        <i style={style} />
      </div>
    </button>
  );
}

function ModelView({ xai, model }: { xai: XaiData; model: ModelData }) {
  const ors = xai.odds_ratios
    .filter((o) => o.feature !== "(상수)")
    .map((o) => ({ ...o, mag: Math.abs(Math.log(o.odds_ratio)) }))
    .sort((a, b) => b.mag - a.mag)
    .slice(0, 8);

  const imps = [...xai.permutation_importance]
    .sort((a, b) => b.auc_drop - a.auc_drop)
    .slice(0, 8);
  const maxDrop = Math.max(...imps.map((i) => i.auc_drop), 1e-6);

  const resRows = Object.entries(model.by_resolution).sort(
    (a, b) => parseFloat(a[0]) - parseFloat(b[0]),
  );

  return (
    <div className="sg">
      <div className="ctl">
        <div className="l">모델 성능 (검증 AUC)</div>
        <table className="stab">
          <thead>
            <tr>
              <th>해상도</th>
              <th className="r">로지스틱</th>
              <th className="r">LightGBM</th>
            </tr>
          </thead>
          <tbody>
            {resRows.map(([res, m]) => (
              <tr key={res}>
                <td className="num">{parseFloat(res).toFixed(2)}°</td>
                <td className="r">{m.metrics.logistic.auc.toFixed(3)}</td>
                <td className="r">{m.metrics.lightgbm ? m.metrics.lightgbm.auc.toFixed(3) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="meth">
          오즈비는 <b>로지스틱 회귀</b> 계수(사고=1)이며, 순열 중요도는 변수를 섞었을 때의{" "}
          <b>AUC 감소폭</b>입니다(클수록 기여 큼). 표본 {int(xai.n)}건 · {xai.resolution.toFixed(2)}°
          기준. 단계별 위험도 점수는 LightGBM, 근거 해석은 로지스틱 오즈비로 봅니다.
        </div>
      </div>

      <div className="view">
        <div className="charts">
          <div>
            <h3>로지스틱 오즈비 (영향 큰 순)</h3>
            <div className="csub">1보다 크면 사고 오즈 증가 · 95% 신뢰구간</div>
            <table className="stab">
              <thead>
                <tr>
                  <th>변수</th>
                  <th className="r">오즈비</th>
                  <th className="r">95% CI</th>
                  <th className="r">p값</th>
                </tr>
              </thead>
              <tbody>
                {ors.map((o) => (
                  <tr key={o.feature}>
                    <td>{o.feature}</td>
                    <td className="r">
                      <b>{or2(o.odds_ratio)}×</b>
                    </td>
                    <td className="r">{ci(o.ci_low, o.ci_high)}</td>
                    <td className="r">
                      <span className={`sig ${sigClass(o.pvalue)}`}>{pval(o.pvalue)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3>순열 중요도 (AUC 감소)</h3>
            <div className="csub">변수를 섞었을 때 떨어지는 AUC · 클수록 기여 큼</div>
            <div className="ebars">
              {imps.map((im) => {
                const w = Math.max((im.auc_drop / maxDrop) * 100, 0);
                return (
                  <div key={im.feature} className="ebar sig">
                    <div className="lab">
                      <span className="nm">{im.feature}</span>
                      <span className="num">{im.auc_drop.toFixed(3)}</span>
                    </div>
                    <div className="track">
                      <i style={{ left: 0, width: `${w}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="note">
              순열 중요도가 음수에 가까우면 해당 변수의 기여가 사실상 없다는 뜻입니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
