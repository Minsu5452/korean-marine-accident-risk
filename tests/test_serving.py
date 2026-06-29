import json

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from marine_accident_risk.serving.app import create_app
from marine_accident_risk.serving.service import RiskService


@pytest.fixture()
def service(tmp_path):
    cache = tmp_path / "cache"
    cache.mkdir()
    reports = tmp_path / "reports"
    (reports / "stats").mkdir(parents=True)
    (reports / "xai").mkdir(parents=True)

    rows = []
    base = pd.Timestamp("2022-01-01")
    for i in range(60):
        cell = "0.1:1_1" if i % 2 == 0 else "0.1:2_2"
        lat, lon = (35.15, 129.15) if cell == "0.1:1_1" else (34.25, 127.25)
        rows.append(
            {
                "grid_id": cell,
                "label": 1 if i % 3 == 0 else 0,  # 두 격자 모두 양·음성 혼합
                "lat": lat,
                "lon": lon,
                "occurred_hour": base + pd.Timedelta(hours=i * 37),
                "wind_speed": 2.0 + (i % 10),
                "air_temp": 5.0 + (i % 15),
                "air_pressure": 1000 + (i % 20),
                "humidity": 40 + (i % 30),
            }
        )
    pd.DataFrame(rows).to_csv(cache / "dataset_0.1.csv", index=False)
    (reports / "stats" / "case_crossover.json").write_text(
        json.dumps({"results": [{"variable": "풍속", "pvalue": 0.001}]}), encoding="utf-8"
    )
    (reports / "xai" / "odds_ratios.json").write_text(
        json.dumps({"odds_ratios": [{"feature": "기온", "odds_ratio": 1.4}, {"feature": "(상수)", "odds_ratio": 0.1}]}),
        encoding="utf-8",
    )
    return RiskService(cache, reports, 0.1)


def test_health(service):
    r = TestClient(create_app(service)).get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_grid_returns_cells(service):
    cells = TestClient(create_app(service)).get("/grid").json()["cells"]
    assert len(cells) == 2
    assert all({"grid_id", "lat", "lon", "risk", "accidents"} <= set(c) for c in cells)


def test_cell_detail_and_404(service):
    client = TestClient(create_app(service))
    r = client.get("/cell/0.1:1_1")
    assert r.status_code == 200
    body = r.json()
    assert "risk" in body and "contributing_factors" in body
    assert body["contributing_factors"][0]["feature"] == "기온"  # (상수) 제외 상위
    assert client.get("/cell/none").status_code == 404


def test_stats_and_xai(service):
    client = TestClient(create_app(service))
    assert client.get("/stats").json()["results"][0]["variable"] == "풍속"
    assert "odds_ratios" in client.get("/xai").json()
