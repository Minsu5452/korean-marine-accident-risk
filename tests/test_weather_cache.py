import pandas as pd

from marine_accident_risk.data.weather_cache import load_weather_hourly, station_coords


def test_load_skips_empty_and_concats(tmp_path):
    pd.DataFrame(
        {"station_code": [1019001], "observed_hour": ["2024-01-01 00:00:00"], "lat": [35.0], "lon": [129.0], "wind_speed": [3.0]}
    ).to_csv(tmp_path / "20240101.csv", index=False)
    (tmp_path / "20240102.csv").write_text("", encoding="utf-8")  # 데이터 없는 날(빈 파일)
    pd.DataFrame(
        {"station_code": [1019001], "observed_hour": ["2024-01-03 01:00:00"], "lat": [35.0], "lon": [129.0], "wind_speed": [5.0]}
    ).to_csv(tmp_path / "20240103.csv", index=False)
    w = load_weather_hourly(tmp_path)
    assert len(w) == 2  # 빈 파일 건너뜀
    assert w["station_code"].iloc[0] == "1019001"  # 문자열로 강제(매칭 일관성)
    assert pd.api.types.is_datetime64_any_dtype(w["observed_hour"])


def test_load_empty_dir_returns_empty(tmp_path):
    assert load_weather_hourly(tmp_path).empty


def test_station_coords_uses_median():
    w = pd.DataFrame({"station_code": ["A", "A", "B"], "lat": [35.0, 35.2, 34.0], "lon": [129.0, 129.0, 127.0]})
    sc = station_coords(w)
    assert set(sc["station_code"]) == {"A", "B"}
    assert float(sc[sc["station_code"] == "A"]["lat"].iloc[0]) == 35.1  # median(35.0, 35.2)
