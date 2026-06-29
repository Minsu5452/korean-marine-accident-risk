import pandas as pd

from marine_accident_risk.stats.crossover import control_times


def test_control_times_seven_days_before_same_hour():
    acc = pd.Series(pd.to_datetime(["2020-03-08 09:30:00", "2020-07-15 18:05:00"]))
    ctrl = control_times(acc, lag_days=7)
    assert list(ctrl) == list(pd.to_datetime(["2020-03-01 09:30:00", "2020-07-08 18:05:00"]))


def test_control_times_custom_lag():
    acc = pd.Series(pd.to_datetime(["2020-03-08 09:30:00"]))
    assert control_times(acc, lag_days=14).iloc[0] == pd.Timestamp("2020-02-23 09:30:00")
