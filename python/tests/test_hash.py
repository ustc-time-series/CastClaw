"""Tests for castclaw_ml.utils.hash."""

import hashlib
from pathlib import Path

import pytest

from castclaw_ml.utils.hash import compute_file_hash, compute_spec_hash, verify_evaluator


class TestComputeSpecHash:
    def test_deterministic(self) -> None:
        spec = {"model": "PatchTST", "seed": 42}
        assert compute_spec_hash(spec) == compute_spec_hash(spec)

    def test_key_order_independent(self) -> None:
        spec_a = {"b": 2, "a": 1, "c": 3}
        spec_b = {"a": 1, "c": 3, "b": 2}
        assert compute_spec_hash(spec_a) == compute_spec_hash(spec_b)

    def test_different_specs_different_hashes(self) -> None:
        spec_a = {"model": "DLinear", "seed": 42}
        spec_b = {"model": "PatchTST", "seed": 42}
        assert compute_spec_hash(spec_a) != compute_spec_hash(spec_b)

    def test_returns_hex_string(self) -> None:
        digest = compute_spec_hash({"test": True})
        assert len(digest) == 64
        assert all(char in "0123456789abcdef" for char in digest)

    def test_nested_spec(self) -> None:
        spec = {"model": "PatchTST", "hyperparams": {"d_model": 128, "n_heads": 8}}
        digest = compute_spec_hash(spec)
        assert len(digest) == 64


class TestComputeFileHash:
    def test_known_content(self, tmp_path: Path) -> None:
        path = tmp_path / "test.txt"
        path.write_text("hello world", encoding="utf-8")
        assert compute_file_hash(path) == hashlib.sha256(b"hello world").hexdigest()

    def test_different_content_different_hash(self, tmp_path: Path) -> None:
        first = tmp_path / "a.txt"
        second = tmp_path / "b.txt"
        first.write_text("hello", encoding="utf-8")
        second.write_text("world", encoding="utf-8")
        assert compute_file_hash(first) != compute_file_hash(second)


class TestVerifyEvaluator:
    def test_first_run_creates_hash_file(self, tmp_path: Path) -> None:
        evaluator = tmp_path / "evaluator.py"
        evaluator.write_text("def evaluate(): pass\n", encoding="utf-8")
        store = tmp_path / ".forecast" / "evaluator.sha256"

        digest = verify_evaluator(evaluator, store)
        assert store.exists()
        assert store.read_text(encoding="utf-8").strip() == digest

    def test_matching_hash_succeeds(self, tmp_path: Path) -> None:
        evaluator = tmp_path / "evaluator.py"
        evaluator.write_text("def evaluate(): pass\n", encoding="utf-8")
        store = tmp_path / ".forecast" / "evaluator.sha256"
        first_digest = verify_evaluator(evaluator, store)

        second_digest = verify_evaluator(evaluator, store)
        assert first_digest == second_digest

    def test_mismatch_raises_system_exit(self, tmp_path: Path) -> None:
        evaluator = tmp_path / "evaluator.py"
        evaluator.write_text("def evaluate(): pass\n", encoding="utf-8")
        store = tmp_path / ".forecast" / "evaluator.sha256"
        verify_evaluator(evaluator, store)

        evaluator.write_text("def evaluate(): return 1\n", encoding="utf-8")

        with pytest.raises(SystemExit):
            verify_evaluator(evaluator, store)
