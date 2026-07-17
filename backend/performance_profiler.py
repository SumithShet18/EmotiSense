"""
Energy and Performance Profiling for EmotiSense inference pipeline.

Measures per-component latency, CPU, memory, and estimates energy consumption.
"""
import time
import os
import threading
from typing import Optional

# ---------------------------------------------------------------------------
# CPU / Memory helpers
# ---------------------------------------------------------------------------

_HAS_PSUTIL = False
try:
    import psutil
    _HAS_PSUTIL = True
except ImportError:
    pass


# psutil's cpu_percent() baseline is stored per-Process-object.
# We cache a single Process instance so real measurements have a baseline.
_SELF_PROC = None
if _HAS_PSUTIL:
    try:
        _SELF_PROC = psutil.Process(os.getpid())
        _SELF_PROC.cpu_percent(interval=0.0)  # first call always returns 0.0, establishes baseline
    except Exception:
        pass


def _get_process():
    """Return cached psutil Process for the current process."""
    return _SELF_PROC if _HAS_PSUTIL else None


def measure_cpu() -> float:
    """Return current CPU usage (%) of this process."""
    proc = _get_process()
    if proc is None:
        return 0.0
    try:
        return proc.cpu_percent(interval=0.0)
    except Exception:
        return 0.0


def measure_memory() -> float:
    """Return current memory usage (MB) of this process."""
    proc = _get_process()
    if proc is None:
        return 0.0
    try:
        mem = proc.memory_info()
        return mem.rss / (1024 * 1024)
    except Exception:
        return 0.0


def measure_cpu_count() -> int:
    """Return number of logical CPU cores."""
    if _HAS_PSUTIL:
        try:
            return psutil.cpu_count(logical=True) or 1
        except Exception:
            return 1
    return 1


# ---------------------------------------------------------------------------
# Energy estimation
# ---------------------------------------------------------------------------

# TDP (W) per logical core for common CPU types.
# These are conservative estimates used when direct measurement is unavailable.
CPU_TDP_PER_CORE: float = 8.0  # Watts per logical core (typical laptop/server CPU)


def estimate_energy(latency_s: float, cpu_usage_pct: float) -> float:
    """
    Estimate energy consumption in Joules.

    Energy (J) = Power (W) × Time (s)

    Power is approximated as:
        CPU utilisation fraction × number of logical cores × TDP per core
    """
    cores = measure_cpu_count()
    power_w = (cpu_usage_pct / 100.0) * cores * CPU_TDP_PER_CORE
    return round(power_w * latency_s, 4)


# ---------------------------------------------------------------------------
# Profiler
# ---------------------------------------------------------------------------

_profile_lock = threading.Lock()


class ProfileStage:
    """Context manager that profiles a single pipeline stage."""

    def __init__(self, name: str):
        self.name = name
        self.latency_ms: float = 0.0
        self.cpu_before: float = 0.0
        self.cpu_after: float = 0.0
        self.memory_before: float = 0.0
        self.memory_after: float = 0.0
        self.energy_joules: float = 0.0
        self._tick: float = 0.0

    def __enter__(self):
        self.cpu_before = measure_cpu()
        self.memory_before = measure_memory()
        self._tick = time.perf_counter()
        return self

    def __exit__(self, *args):
        elapsed = time.perf_counter() - self._tick
        self.latency_ms = round(elapsed * 1000, 2)
        self.cpu_after = measure_cpu()
        self.memory_after = measure_memory()
        avg_cpu = (self.cpu_before + self.cpu_after) / 2.0
        self.energy_joules = estimate_energy(elapsed, avg_cpu)

    def to_dict(self) -> dict:
        avg_cpu = (self.cpu_before + self.cpu_after) / 2.0
        avg_mem = (self.memory_before + self.memory_after) / 2.0
        return {
            "component": self.name,
            "latency_ms": self.latency_ms,
            "cpu_usage": round(avg_cpu, 2),
            "memory_mb": round(avg_mem, 2),
            "energy_joules": self.energy_joules,
        }


def profile_pipeline(
    stages: list[tuple[str, callable]],
) -> tuple[list[dict], dict]:
    """
    Run a list of (name, callable) stages and profile each one.

    Returns:
        stage_metrics: list of per-stage dicts
        totals: dict with aggregate metrics
    """
    results: list[dict] = []
    total_latency = 0.0
    total_energy = 0.0
    peak_memory = 0.0
    cpu_samples: list[float] = []

    for name, fn in stages:
        stage = ProfileStage(name)
        with stage:
            fn()
        d = stage.to_dict()
        results.append(d)
        total_latency += d["latency_ms"]
        total_energy += d["energy_joules"]
        peak_memory = max(peak_memory, d["memory_mb"])
        cpu_samples.append(d["cpu_usage"])

    avg_cpu = round(sum(cpu_samples) / len(cpu_samples), 2) if cpu_samples else 0.0
    throughput = round(1000 / total_latency, 2) if total_latency > 0 else 0.0

    totals = {
        "total_latency_ms": round(total_latency, 2),
        "total_energy_joules": round(total_energy, 4),
        "peak_memory_mb": round(peak_memory, 2),
        "avg_cpu_usage": avg_cpu,
        "throughput_inferences_per_sec": throughput,
    }

    return results, totals
