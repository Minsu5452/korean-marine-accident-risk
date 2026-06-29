from pathlib import Path

import pytest

from marine_accident_risk.config import Settings, load_settings


def test_defaults_match_korea_eez():
    s = Settings()
    assert (s.eez_lat_min, s.eez_lat_max) == (32.0, 39.0)
    assert (s.eez_lon_min, s.eez_lon_max) == (124.0, 132.0)
    assert s.eez_bbox == (32.0, 39.0, 124.0, 132.0)
    assert s.grid_resolutions == [0.05, 0.1, 0.25]


def test_yaml_overrides_defaults(tmp_path: Path):
    cfg = tmp_path / "c.yaml"
    cfg.write_text("match_max_km: 10.0\neez_lat_max: 38.5\n", encoding="utf-8")
    s = load_settings(cfg)
    assert s.match_max_km == 10.0
    assert s.eez_lat_max == 38.5


def test_env_beats_yaml(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    cfg = tmp_path / "c.yaml"
    cfg.write_text("match_max_km: 10.0\n", encoding="utf-8")
    monkeypatch.setenv("MAR_MATCH_MAX_KM", "99.0")
    s = load_settings(cfg)
    assert s.match_max_km == 99.0  # 환경변수가 yaml을 이긴다
