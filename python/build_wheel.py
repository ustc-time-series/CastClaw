"""
Build script to compile castclaw_ml Python source to Cython extensions (.so)
and produce a binary-only wheel.

Usage:
    cd python/
    uv run python build_wheel.py
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path
from setuptools import setup, find_packages
from Cython.Build import cythonize
from Cython.Distutils import build_ext
import Cython.Compiler.Options as cython_options

# Disable line tracing for maximum obfuscation
cython_options.docstrings = False

SRC = Path(__file__).parent / "src"
PKG = SRC / "castclaw_ml"
DIST = Path(__file__).parent / "dist"


def collect_modules():
    """Collect all .py files in castclaw_ml for Cython compilation."""
    extensions = []
    for py_file in sorted(PKG.rglob("*.py")):
        if py_file.name == "__init__.py":
            # Keep __init__ as Python (needed for package discovery)
            continue
        # Compute module dotted name
        rel = py_file.relative_to(SRC)
        module_name = str(rel.with_suffix("")).replace(os.sep, ".")
        extensions.append(str(py_file))
    return extensions


if __name__ == "__main__":
    print(f"Collecting modules from {PKG} ...")
    py_files = collect_modules()
    print(f"  {len(py_files)} modules to compile")

    # Run cythonize + build_ext to produce .so files in place
    sys.argv = ["setup.py", "build_ext", "--inplace"]
    setup(
        name="castclaw-ml",
        ext_modules=cythonize(
            py_files,
            compiler_directives={
                "language_level": "3",
                "boundscheck": False,
                "wraparound": False,
                "embedsignature": False,
            },
            annotate=False,
            nthreads=os.cpu_count() or 4,
        ),
        cmdclass={"build_ext": build_ext},
        script_args=["build_ext", "--inplace"],
    )

    print("\nCython compilation complete.")
    print("Build wheel with: uv build --wheel")
