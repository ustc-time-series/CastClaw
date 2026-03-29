"""Tests for Phase 1 safety invariants."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from castclaw_ml.data_loader import (
    compute_split_indices,
    load_dataset,
    reject_if_test_in_forecast,
)
from castclaw_ml.evaluator import evaluate
from castclaw_ml.utils.hash import verify_evaluator


class TestSAFE01TestSetInaccessible:
    def test_test_split_rejected_in_forecast(self) -> None:
        spec = {"phase": "forecast", "eval_split": "test"}
        with pytest.raises(SystemExit, match="SAFETY VIOLATION"):
            reject_if_test_in_forecast(spec)

    def test_val_split_allowed_in_forecast(self) -> None:
        reject_if_test_in_forecast({"phase": "forecast", "eval_split": "val"})

    def test_test_split_allowed_post_forecast(self) -> None:
        reject_if_test_in_forecast({"phase": "post-forecast", "eval_split": "test"})

    def test_default_phase_is_restrictive(self) -> None:
        with pytest.raises(SystemExit, match="SAFETY VIOLATION"):
            reject_if_test_in_forecast({"eval_split": "test"})

    def test_load_dataset_respects_allowed_splits(self, tmp_path: Path) -> None:
        csv_path = tmp_path / "data.csv"
        pd.DataFrame(
            {
                "date": pd.date_range("2020-01-01", periods=100, freq="h"),
                "OT": np.linspace(0, 99, 100),
            }
        ).to_csv(csv_path, index=False)

        result = load_dataset(
            {
                "dataset_path": str(csv_path),
                "target_col": "OT",
                "time_col": "date",
                "train_ratio": 0.7,
                "val_ratio": 0.1,
            },
            allowed_splits=["train", "val"],
        )

        assert set(result) == {"train", "val"}


class TestSAFE02FrozenSplits:
    def test_splits_computed_from_spec_ratios(self) -> None:
        assert compute_split_indices(1000, 0.7, 0.1) == (700, 800)

    def test_load_dataset_raises_on_empty_allowed_splits(self, tmp_path: Path) -> None:
        csv_path = tmp_path / "data.csv"
        pd.DataFrame(
            {
                "date": pd.date_range("2020-01-01", periods=20, freq="h"),
                "OT": np.linspace(0, 19, 20),
            }
        ).to_csv(csv_path, index=False)

        with pytest.raises(ValueError, match="allowed_splits must not be empty"):
            load_dataset(
                {
                    "dataset_path": str(csv_path),
                    "target_col": "OT",
                    "time_col": "date",
                    "train_ratio": 0.7,
                    "val_ratio": 0.1,
                },
                allowed_splits=[],
            )

    def test_scaler_fit_on_train_only(self, tmp_path: Path) -> None:
        csv_path = tmp_path / "data.csv"
        train_values = np.full(70, 10.0)
        val_values = np.full(10, 100.0)
        test_values = np.full(20, 1000.0)

        pd.DataFrame(
            {
                "date": pd.date_range("2020-01-01", periods=100, freq="h"),
                "OT": np.concatenate([train_values, val_values, test_values]),
            }
        ).to_csv(csv_path, index=False)

        result = load_dataset(
            {
                "dataset_path": str(csv_path),
                "target_col": "OT",
                "time_col": "date",
                "train_ratio": 0.7,
                "val_ratio": 0.1,
            },
            allowed_splits=["train", "val"],
        )

        assert np.mean(result["train"]["data"]) == pytest.approx(0.0, abs=1e-6)
        assert np.mean(result["val"]["data"]) > 1.0


class TestSAFE03EvalProtocolFixed:
    def test_evaluator_ignores_spec_metric_preferences(self, tmp_path: Path) -> None:
        run_dir = tmp_path / "runs" / "test"
        run_dir.mkdir(parents=True)
        hash_store = tmp_path / ".forecast" / "evaluator.sha256"

        pd.DataFrame(
            {
                "timestamp": ["t1", "t2"],
                "actual": [1.0, 2.0],
                "predicted": [1.5, 2.5],
            }
        ).to_csv(run_dir / "predictions.csv", index=False)

        result = evaluate(
            run_dir,
            {
                "model": "test",
                "eval_split": "val",
                "train_ratio": 0.7,
                "val_ratio": 0.1,
                "metrics": ["rmse"],
            },
            hash_store,
        )

        assert set(result["metrics"]) == {"mse", "mae", "wape", "mase"}


class TestSAFE04DriftDetection:
    def test_eval_json_contains_hashes(self, tmp_path: Path) -> None:
        run_dir = tmp_path / "runs" / "test"
        run_dir.mkdir(parents=True)
        hash_store = tmp_path / ".forecast" / "evaluator.sha256"

        pd.DataFrame(
            {
                "timestamp": ["t1"],
                "actual": [1.0],
                "predicted": [1.0],
            }
        ).to_csv(run_dir / "predictions.csv", index=False)

        result = evaluate(
            run_dir,
            {"model": "test", "eval_split": "val", "train_ratio": 0.7, "val_ratio": 0.1},
            hash_store,
        )

        assert len(result["evaluator_hash"]) == 64
        assert result["spec_hash"] == result["run_id"]

    def test_modified_evaluator_detected(self, tmp_path: Path) -> None:
        evaluator_py = tmp_path / "evaluator.py"
        evaluator_py.write_text("original content\n", encoding="utf-8")
        store = tmp_path / ".forecast" / "evaluator.sha256"

        verify_evaluator(evaluator_py, store)
        evaluator_py.write_text("modified content\n", encoding="utf-8")

        with pytest.raises(SystemExit, match="INTEGRITY VIOLATION"):
            verify_evaluator(evaluator_py, store)
