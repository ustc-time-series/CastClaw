"""Tests for castclaw_ml.utils.metrics."""

import numpy as np

from castclaw_ml.utils.metrics import mae, mase, mse, wape


class TestMSE:
    def test_perfect_prediction(self) -> None:
        pred = np.array([1.0, 2.0, 3.0])
        true = np.array([1.0, 2.0, 3.0])
        assert mse(pred, true) == 0.0

    def test_uniform_offset(self) -> None:
        pred = np.array([1.0, 2.0, 3.0])
        true = np.array([2.0, 3.0, 4.0])
        assert mse(pred, true) == 1.0

    def test_returns_float(self) -> None:
        result = mse(np.array([1.0]), np.array([2.0]))
        assert isinstance(result, float)


class TestMAE:
    def test_perfect_prediction(self) -> None:
        pred = np.array([1.0, 2.0, 3.0])
        true = np.array([1.0, 2.0, 3.0])
        assert mae(pred, true) == 0.0

    def test_uniform_offset(self) -> None:
        pred = np.array([1.0, 2.0, 3.0])
        true = np.array([2.0, 3.0, 4.0])
        assert mae(pred, true) == 1.0

    def test_mixed_errors(self) -> None:
        pred = np.array([1.0, 2.0, 3.0])
        true = np.array([2.0, 2.0, 1.0])
        assert mae(pred, true) == 1.0


class TestWAPE:
    def test_basic(self) -> None:
        pred = np.array([1.0, 2.0, 3.0])
        true = np.array([2.0, 3.0, 4.0])
        assert abs(wape(pred, true) - (3.0 / 9.0)) < 1e-10

    def test_zero_denominator(self) -> None:
        pred = np.array([1.0, 2.0])
        true = np.array([0.0, 0.0])
        assert wape(pred, true) == float("inf")

    def test_perfect_prediction(self) -> None:
        pred = np.array([5.0, 10.0])
        true = np.array([5.0, 10.0])
        assert wape(pred, true) == 0.0


class TestMASE:
    def test_basic(self) -> None:
        train = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        pred = np.array([6.0, 7.0])
        true = np.array([6.5, 7.5])
        assert abs(mase(pred, true, train) - 0.5) < 1e-10

    def test_constant_train_returns_inf(self) -> None:
        train = np.array([5.0, 5.0, 5.0, 5.0])
        pred = np.array([1.0])
        true = np.array([2.0])
        assert mase(pred, true, train) == float("inf")

    def test_returns_float(self) -> None:
        train = np.array([1.0, 2.0, 3.0])
        result = mase(np.array([4.0]), np.array([5.0]), train)
        assert isinstance(result, float)
