"""Tests for castclaw_ml.evaluator."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from castclaw_ml.evaluator import evaluate
from castclaw_ml.utils.hash import compute_file_hash


@pytest.fixture
def run_dir(tmp_path: Path) -> Path:
    """Create a minimal run directory with predictions.csv."""
    directory = tmp_path / "runs" / "test_run"
    directory.mkdir(parents=True)

    pd.DataFrame(
        {
            "timestamp": ["2020-01-01", "2020-01-02", "2020-01-03"],
            "actual": [1.0, 2.0, 3.0],
            "predicted": [1.1, 2.2, 2.8],
        }
    ).to_csv(directory / "predictions.csv", index=False)

    return directory


@pytest.fixture
def spec() -> dict:
    return {
        "model": "DLinear",
        "dataset_path": "data/test.csv",
        "target_col": "OT",
        "time_col": "date",
        "train_ratio": 0.7,
        "val_ratio": 0.1,
        "test_ratio": 0.2,
        "seq_len": 96,
        "pred_len": 96,
        "phase": "forecast",
        "eval_split": "val",
        "seed": 42,
    }


@pytest.fixture
def hash_store(tmp_path: Path) -> Path:
    return tmp_path / ".forecast" / "evaluator.sha256"


class TestEvaluate:
    def test_produces_eval_json(self, run_dir: Path, spec: dict, hash_store: Path) -> None:
        evaluate(run_dir, spec, hash_store)
        assert (run_dir / "eval.json").exists()

    def test_eval_json_has_required_keys(
        self, run_dir: Path, spec: dict, hash_store: Path
    ) -> None:
        result = evaluate(run_dir, spec, hash_store)
        required_keys = {
            "run_id",
            "evaluator_hash",
            "spec_hash",
            "metrics",
            "eval_split",
            "timestamp",
        }
        assert required_keys.issubset(result.keys())

    def test_metrics_are_floats(self, run_dir: Path, spec: dict, hash_store: Path) -> None:
        result = evaluate(run_dir, spec, hash_store, train_values=np.array([0.5, 1.0, 1.5]))
        for key in ("mse", "mae", "wape", "mase"):
            assert isinstance(result["metrics"][key], float), f"{key} is not float"

    def test_evaluator_hash_matches_file(
        self, run_dir: Path, spec: dict, hash_store: Path
    ) -> None:
        result = evaluate(run_dir, spec, hash_store)
        evaluator_path = Path(__file__).parent.parent / "src" / "castclaw_ml" / "evaluator.py"
        assert result["evaluator_hash"] == compute_file_hash(evaluator_path)

    def test_deterministic_scores(self, run_dir: Path, spec: dict, hash_store: Path) -> None:
        train_values = np.array([0.5, 1.0, 1.5, 2.0])
        result_one = evaluate(run_dir, spec, hash_store, train_values=train_values)
        result_two = evaluate(run_dir, spec, hash_store, train_values=train_values)
        assert result_one["metrics"] == result_two["metrics"]

    def test_with_train_values_includes_mase(
        self, run_dir: Path, spec: dict, hash_store: Path
    ) -> None:
        result = evaluate(run_dir, spec, hash_store, train_values=np.array([0.5, 1.0, 1.5]))
        assert isinstance(result["metrics"]["mase"], float)

    def test_without_train_values_mase_is_none(
        self, run_dir: Path, spec: dict, hash_store: Path
    ) -> None:
        result = evaluate(run_dir, spec, hash_store)
        assert result["metrics"]["mase"] is None

    def test_evaluator_integrity_failure(
        self, run_dir: Path, spec: dict, hash_store: Path
    ) -> None:
        hash_store.parent.mkdir(parents=True, exist_ok=True)
        hash_store.write_text("bad-hash", encoding="utf-8")

        with pytest.raises(SystemExit, match="INTEGRITY VIOLATION"):
            evaluate(run_dir, spec, hash_store)
