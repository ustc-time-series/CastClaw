"""End-to-end tests for the experiment runner."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from castclaw_ml.utils.hash import compute_spec_hash


PYTHON_DIR = Path(__file__).parent.parent
FIXTURES_DIR = Path(__file__).parent / "fixtures"
SYNTHETIC_CSV = FIXTURES_DIR / "synthetic_etth1.csv"


@pytest.fixture
def spec_path(tmp_path: Path) -> tuple[Path, dict, Path]:
    """Create a minimal DLinear spec for fast testing."""
    spec = {
        "model": "DLinear",
        "dataset_path": str(SYNTHETIC_CSV),
        "target_col": "OT",
        "time_col": "date",
        "freq": "h",
        "train_ratio": 0.7,
        "val_ratio": 0.1,
        "test_ratio": 0.2,
        "seq_len": 24,
        "pred_len": 12,
        "label_len": 12,
        "phase": "forecast",
        "eval_split": "val",
        "seed": 42,
        "hyperparams": {
            "d_model": 64,
            "n_heads": 4,
            "e_layers": 1,
            "d_layers": 1,
            "d_ff": 128,
            "dropout": 0.1,
            "train_epochs": 2,
            "batch_size": 16,
            "learning_rate": 0.001,
            "moving_avg": 25,
            "individual": False,
        },
        "metrics": ["mse", "mae", "wape", "mase"],
    }
    spec_file = tmp_path / "test_spec.json"
    spec_file.write_text(json.dumps(spec, indent=2), encoding="utf-8")
    return spec_file, spec, tmp_path


def run_runner(spec_path: Path, out_dir: Path, timeout: int = 120) -> dict:
    """Invoke the runner as a subprocess and parse the final JSON line."""
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "castclaw_ml.runner",
            "--spec",
            str(spec_path),
            "--out-dir",
            str(out_dir / "runs"),
            "--evaluator-hash-store",
            str(out_dir / ".forecast" / "evaluator.sha256"),
        ],
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=str(PYTHON_DIR),
    )

    stdout_lines = [line for line in result.stdout.strip().splitlines() if line.strip()]
    if stdout_lines:
        try:
            payload = json.loads(stdout_lines[-1])
            payload.setdefault("returncode", result.returncode)
            return payload
        except json.JSONDecodeError:
            pass

    return {
        "status": "error",
        "error": result.stderr,
        "stdout": result.stdout,
        "returncode": result.returncode,
    }


class TestRunnerE2E:
    @pytest.mark.slow
    def test_full_pipeline_dlinear(self, spec_path: tuple[Path, dict, Path]) -> None:
        spec_file, _spec, tmp_dir = spec_path
        result = run_runner(spec_file, tmp_dir)

        assert result["status"] in ("success", "cached"), f"Runner failed: {result}"
        assert "run_id" in result
        assert len(result["run_id"]) == 64

    @pytest.mark.slow
    def test_produces_all_artifacts(self, spec_path: tuple[Path, dict, Path]) -> None:
        spec_file, _spec, tmp_dir = spec_path
        result = run_runner(spec_file, tmp_dir)

        assert result["status"] in ("success", "cached")
        run_dir = Path(result["out_dir"])
        assert (run_dir / "spec.json").exists()
        assert (run_dir / "predictions.csv").exists()
        assert (run_dir / "actual.npy").exists()
        assert (run_dir / "pred.npy").exists()
        assert (run_dir / "eval.json").exists()
        assert (run_dir / "train.log").exists()

    @pytest.mark.slow
    def test_eval_json_has_metrics(self, spec_path: tuple[Path, dict, Path]) -> None:
        spec_file, _spec, tmp_dir = spec_path
        result = run_runner(spec_file, tmp_dir)

        assert result["status"] in ("success", "cached")
        eval_json = json.loads((Path(result["out_dir"]) / "eval.json").read_text(encoding="utf-8"))
        assert "metrics" in eval_json
        for metric in ("mse", "mae", "wape"):
            assert isinstance(eval_json["metrics"][metric], float)

    @pytest.mark.slow
    def test_deterministic_scores(self, spec_path: tuple[Path, dict, Path]) -> None:
        spec_file, _spec, tmp_dir = spec_path
        first_result = run_runner(spec_file, tmp_dir)
        second_result = run_runner(spec_file, tmp_dir)

        assert first_result["status"] in ("success", "cached")
        assert second_result["status"] == "cached"
        assert first_result["run_id"] == second_result["run_id"]

    @pytest.mark.slow
    def test_run_id_is_spec_hash(self, spec_path: tuple[Path, dict, Path]) -> None:
        spec_file, spec, tmp_dir = spec_path
        result = run_runner(spec_file, tmp_dir)
        assert result["run_id"] == compute_spec_hash(spec)

    def test_test_split_rejected(self, tmp_path: Path) -> None:
        spec = {
            "model": "DLinear",
            "dataset_path": str(SYNTHETIC_CSV),
            "target_col": "OT",
            "time_col": "date",
            "freq": "h",
            "train_ratio": 0.7,
            "val_ratio": 0.1,
            "test_ratio": 0.2,
            "seq_len": 24,
            "pred_len": 12,
            "label_len": 12,
            "phase": "forecast",
            "eval_split": "test",
            "seed": 42,
            "hyperparams": {"train_epochs": 1, "batch_size": 8, "learning_rate": 0.001},
        }
        spec_file = tmp_path / "bad_spec.json"
        spec_file.write_text(json.dumps(spec), encoding="utf-8")

        result = run_runner(spec_file, tmp_path)
        assert result.get("status") == "error"
        assert result.get("returncode") != 0

    @pytest.mark.slow
    def test_eval_json_has_evaluator_hash(self, spec_path: tuple[Path, dict, Path]) -> None:
        spec_file, _spec, tmp_dir = spec_path
        result = run_runner(spec_file, tmp_dir)

        eval_json = json.loads((Path(result["out_dir"]) / "eval.json").read_text(encoding="utf-8"))
        assert len(eval_json["evaluator_hash"]) == 64

    @pytest.mark.slow
    def test_spec_json_in_run_dir_is_canonical(self, spec_path: tuple[Path, dict, Path]) -> None:
        spec_file, spec, tmp_dir = spec_path
        result = run_runner(spec_file, tmp_dir)

        stored_spec = (Path(result["out_dir"]) / "spec.json").read_text(encoding="utf-8")
        assert compute_spec_hash(spec) == compute_spec_hash(json.loads(stored_spec))
