"""Generate a small deterministic synthetic CSV for offline testing.

Produces a 500-row hourly CSV with columns: date, OT
Pattern: daily cycle + weekly cycle + linear trend + Gaussian noise
Seed: 42 for reproducibility
"""
from pathlib import Path

import numpy as np
import pandas as pd


def generate(n: int = 500, seed: int = 42, path: str | None = None) -> str:
    if path is None:
        path = str(Path(__file__).parent / "synthetic_etth1.csv")
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2020-01-01", periods=n, freq="h")
    t = np.arange(n)
    signal = (
        np.sin(2 * np.pi * t / 24)            # daily cycle
        + 0.3 * np.sin(2 * np.pi * t / 168)  # weekly cycle
        + 0.01 * t                           # linear trend
        + rng.normal(0, 0.1, n)              # noise
    )
    df = pd.DataFrame({"date": dates, "OT": signal.round(4)})
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return path


if __name__ == "__main__":
    out = generate()
    print(f"Generated: {out}")
