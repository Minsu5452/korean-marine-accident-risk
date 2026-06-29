"""수집된 시간별 기상 캐시(data/cache/weather_hourly/<YYYYMMDD>.csv)를 불러온다."""

from __future__ import annotations

from pathlib import Path

import pandas as pd


def load_weather_hourly(cache_dir: str | Path) -> pd.DataFrame:
    """일자별 CSV를 모아 하나의 DataFrame으로 돌려준다. 빈 파일(데이터 없는 날)은 건너뛴다."""
    files = sorted(Path(cache_dir).glob("*.csv"))
    frames = [pd.read_csv(f, parse_dates=["observed_hour"]) for f in files if f.stat().st_size > 0]
    if not frames:
        return pd.DataFrame()
    w = pd.concat(frames, ignore_index=True)
    w["station_code"] = w["station_code"].astype(str)
    return w


def station_coords(weather: pd.DataFrame) -> pd.DataFrame:
    """지점 좌표(기상 레코드 lat/lon의 지점별 중앙값). 컬럼: station_code·lat·lon."""
    if weather.empty:
        return pd.DataFrame(columns=["station_code", "lat", "lon"])
    g = weather.dropna(subset=["lat", "lon"]).groupby("station_code")[["lat", "lon"]].median()
    return g.reset_index()
