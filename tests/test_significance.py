import numpy as np
from scipy import stats as st

from marine_accident_risk.stats.significance import (
    benjamini_hochberg,
    compare_paired,
    compare_unpaired,
    is_normal,
)

# 정규 분위수로 만든 결정적 표본(난수 흔들림 없이 정규성 판정을 안정적으로 테스트).
NORMAL = st.norm.ppf(np.linspace(0.005, 0.995, 500))
EXPON = st.expon.ppf(np.linspace(0.005, 0.995, 500))


def test_is_normal_true_for_gaussian():
    assert is_normal(NORMAL) is True


def test_is_normal_false_for_exponential():
    assert is_normal(EXPON) is False


def test_is_normal_false_for_tiny_sample():
    assert is_normal([1.0, 2.0]) is False


def test_compare_paired_normal_uses_paired_t():
    base = st.norm.ppf(np.linspace(0.01, 0.99, 200))
    control = 10 + 2 * base
    case = control + 1.0 + 0.3 * base[::-1]  # 차이 = 1.0 + 정규 → 정규
    r = compare_paired("wind_speed", case, control)
    assert r.test == "paired_t"
    assert r.effect_name == "cohen_d"
    assert r.pvalue < 0.05
    assert r.effect_size > 0  # case > control
    assert r.n == 200


def test_compare_paired_nonnormal_uses_wilcoxon():
    base = st.norm.ppf(np.linspace(0.01, 0.99, 200))
    control = 10 + 2 * base
    case = control + st.expon.ppf(np.linspace(0.01, 0.99, 200))  # 차이가 지수분포(비정규)
    r = compare_paired("v", case, control)
    assert r.test == "wilcoxon"
    assert r.effect_name == "rank_biserial"


def test_compare_paired_drops_nan_pairs():
    r = compare_paired("v", [1.0, 2.0, np.nan, 4.0, 5.0], [0.0, np.nan, 2.0, 3.0, 3.5])
    assert r.n == 3  # nan 있는 짝 2개 제거 → 3쌍


def test_compare_unpaired_normal_uses_welch():
    q = st.norm.ppf(np.linspace(0.01, 0.99, 150))
    r = compare_unpaired("v", 5 + q, 4 + q)
    assert r.test == "welch_t"
    assert r.effect_size > 0  # a > b


def test_compare_unpaired_nonnormal_uses_mannwhitney():
    q = st.expon.ppf(np.linspace(0.01, 0.99, 150))
    r = compare_unpaired("v", 2 * q, q)
    assert r.test == "mannwhitney"
    assert r.effect_name == "rank_biserial"


def test_benjamini_hochberg_rejects_small_pvalues():
    rejected, qv = benjamini_hochberg([0.001, 0.008, 0.04, 0.6, 0.9], alpha=0.05)
    assert rejected[0] and rejected[1]
    assert not rejected[3] and not rejected[4]
    assert len(qv) == 5
    assert (np.diff(np.sort(qv)) >= -1e-9).all()  # q값 단조성
