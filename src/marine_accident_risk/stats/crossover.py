"""case-crossover 대조 시각 생성.

각 사고에 대해 같은 위치·같은 관측 지점의 '사고 전 N일(기본 7일) 동시간'을 대조로 둔다.
사고 시점 기상(case)과 이 대조 시점 기상(control)을 짝지어 비교하면, 계절·지점 같은
고정 요인을 자연스럽게 통제할 수 있다(짝지은 비교).
"""

from __future__ import annotations

import pandas as pd


def control_times(occurred_at: pd.Series, lag_days: int = 7) -> pd.Series:
    """사고 시각 시리즈를 받아 대조 시각(사고 전 lag_days일, 같은 시·분) 시리즈를 돌려준다."""
    return pd.to_datetime(occurred_at) - pd.Timedelta(days=lag_days)
