import math
import random
from pathlib import Path


SAMPLE_COUNT = 1000
DELTA_T = 0.02
HEADER = (
    "Time (s)\tAcceleration x (m/s^2)\tAcceleration y (m/s^2)\t"
    "Acceleration z (m/s^2)\tAbsolute acceleration (m/s^2)\t"
    "Gyroscope x (rad/s)\tGyroscope y (rad/s)\tGyroscope z (rad/s)\t"
    "Gyroscope magnitude (rad/s)"
)

# Phase timing (in sample indices)
BASELINE_END = 400          # Normal riding until index 400 (8 seconds)
DECELERATION_START = 400    # Deceleration phase starts
DECELERATION_END = 415      # Deceleration lasts 0.3 seconds (15 samples)
FREEFALL_START = 415        # Freefall phase starts
FREEFALL_END = 430          # Freefall lasts 0.3 seconds (15 samples)
IMPACT_INDEX = 430          # Impact occurs at index 430
POST_IMPACT_START = 431     # Post-impact motion starts


def _baseline_motion(noise_scale: float) -> tuple[float, float, float]:
    """Generate baseline motion with gravity + small noise."""
    base_y = 9.80665
    return (
        random.gauss(0.0, noise_scale),
        base_y + random.gauss(0.0, noise_scale),
        random.gauss(0.0, noise_scale),
    )


def _deceleration_motion(progress: float) -> tuple[float, float, float]:
    """Generate sudden deceleration motion.

    Progress goes from 0.0 to 1.0 during the deceleration phase.
    Creates a strong negative acceleration (deceleration) on the Y-axis.
    """
    # Strong deceleration on Y-axis (forward direction)
    # At peak deceleration, we want -25 m/s² to ensure we exceed -15 m/s² threshold
    decel_strength = -25.0 * math.sin(progress * math.pi)  # Smooth deceleration curve

    return (
        random.gauss(0.0, 0.5),  # Small X noise
        9.80665 + decel_strength,  # Y-axis deceleration
        random.gauss(0.0, 0.5),  # Small Z noise
    )


def _freefall_motion(progress: float) -> tuple[float, float, float]:
    """Generate freefall motion (weightlessness).

    Progress goes from 0.0 to 1.0 during the freefall phase.
    Absolute acceleration should be < 2.0 m/s² to trigger freefall detection.
    """
    # Very low acceleration in all axes to simulate weightlessness
    # Target: absolute acceleration around 0.5-1.5 m/s²
    return (
        random.gauss(0.0, 0.3),
        random.gauss(0.0, 0.3),
        random.gauss(0.0, 0.3),
    )


def _impact_motion() -> tuple[float, float, float]:
    """Generate ground impact motion.

    Creates a strong spike in acceleration (> 25 m/s²) to simulate hitting the ground.
    """
    # Strong impact forces on multiple axes
    return (
        random.gauss(15.0, 3.0),  # X-axis impact
        random.gauss(35.0, 5.0),  # Y-axis impact (strongest)
        random.gauss(20.0, 3.0),  # Z-axis impact
    )


def _post_impact_calm() -> tuple[float, float, float]:
    """Generate calm post-impact motion (person lying still)."""
    # Very low motion, mostly gravity
    return _baseline_motion(0.05)


def _post_impact_active(t: float) -> tuple[float, float, float]:
    """Generate active post-impact motion (person moving/recovering)."""
    # Moderate activity - person is moving around
    amplitude = 3.0
    return (
        amplitude * math.sin(2.0 * math.pi * 1.2 * t),
        9.80665 + amplitude * math.sin(2.0 * math.pi * 1.5 * t + 0.5),
        amplitude * math.sin(2.0 * math.pi * 1.8 * t + 1.0),
    )


def _write_dataset(path: Path, rows: list[str]) -> None:
    """Write dataset to CSV file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join([HEADER, *rows]), encoding="ascii")


def _synthesise_rows(post_mode: str) -> list[str]:
    """Synthesize accelerometer data with three-phase fall detection pattern.

    Args:
        post_mode: "calm" for positive fall (person stays down),
                   "active" for false positive (person gets up)

    Returns:
        List of CSV rows with tab-separated values
    """
    random.seed(42 if post_mode == "calm" else 1337)
    rows: list[str] = []

    for index in range(SAMPLE_COUNT):
        time_s = index * DELTA_T

        # Phase 1: Baseline motion (normal riding/walking)
        if index < DECELERATION_START:
            ax, ay, az = _baseline_motion(0.15)
            gx = random.gauss(0.02, 0.01)
            gy = random.gauss(0.02, 0.01)
            gz = random.gauss(0.02, 0.01)

        # Phase 2: Deceleration (sudden braking/slowing)
        elif DECELERATION_START <= index < DECELERATION_END:
            progress = (index - DECELERATION_START) / (DECELERATION_END - DECELERATION_START)
            ax, ay, az = _deceleration_motion(progress)
            # Increased gyroscope activity during deceleration
            gx = random.gauss(0.5, 0.2)
            gy = random.gauss(0.6, 0.2)
            gz = random.gauss(0.7, 0.2)

        # Phase 3: Freefall (weightlessness)
        elif FREEFALL_START <= index < FREEFALL_END:
            progress = (index - FREEFALL_START) / (FREEFALL_END - FREEFALL_START)
            ax, ay, az = _freefall_motion(progress)
            # Moderate gyroscope rotation during freefall
            gx = random.gauss(1.5, 0.5)
            gy = random.gauss(1.8, 0.5)
            gz = random.gauss(2.0, 0.5)

        # Phase 4: Impact (hitting the ground)
        elif index == IMPACT_INDEX:
            ax, ay, az = _impact_motion()
            # Very high gyroscope activity at impact
            gx = random.gauss(4.0, 0.5)
            gy = random.gauss(4.5, 0.5)
            gz = random.gauss(5.0, 0.5)

        # Phase 5: Post-impact motion
        else:
            if post_mode == "calm":
                # Positive fall: person stays still
                ax, ay, az = _post_impact_calm()
                gx = random.gauss(0.01, 0.005)
                gy = random.gauss(0.01, 0.005)
                gz = random.gauss(0.01, 0.005)
            else:
                # False positive: person is active/moving
                post_time = time_s - (POST_IMPACT_START * DELTA_T)
                ax, ay, az = _post_impact_active(post_time)
                gx = 0.6 * math.sin(2.0 * math.pi * 1.3 * post_time)
                gy = 0.7 * math.sin(2.0 * math.pi * 1.5 * post_time + 0.5)
                gz = 0.8 * math.sin(2.0 * math.pi * 1.1 * post_time + 1.0)

        # Calculate magnitude values
        svm = math.sqrt(ax * ax + ay * ay + az * az)
        gyro_mag = math.sqrt(gx * gx + gy * gy + gz * gz)

        # Format row with tab separation
        row = (
            f"{time_s:.2f}\t{ax:.4f}\t{ay:.4f}\t{az:.4f}\t{svm:.4f}\t"
            f"{gx:.4f}\t{gy:.4f}\t{gz:.4f}\t{gyro_mag:.4f}"
        )
        rows.append(row)

    return rows


def main() -> None:
    """Generate mock datasets for fall detection testing."""
    base_dir = Path(__file__).resolve().parents[1]
    output_dir = base_dir / "FallDetectionResults" / "script_generated"

    print("Generating mock datasets...")
    print(f"Output directory: {output_dir}")

    # Generate positive fall dataset (person stays down after fall)
    print("\n1. Generating mock_crash_positive.csv (real fall - person stays down)")
    calm_rows = _synthesise_rows("calm")
    _write_dataset(output_dir / "mock_crash_positive.csv", calm_rows)
    print(f"   [OK] Generated {len(calm_rows)} data points")
    print(f"   - Deceleration: {DECELERATION_START * DELTA_T:.2f}s - {DECELERATION_END * DELTA_T:.2f}s")
    print(f"   - Freefall: {FREEFALL_START * DELTA_T:.2f}s - {FREEFALL_END * DELTA_T:.2f}s")
    print(f"   - Impact: {IMPACT_INDEX * DELTA_T:.2f}s")
    print(f"   - Post-impact: Calm (person lying still)")

    # Generate false positive dataset (person is active after fall)
    print("\n2. Generating mock_crash_false_positive.csv (fall but person recovers)")
    active_rows = _synthesise_rows("active")
    _write_dataset(output_dir / "mock_crash_false_positive.csv", active_rows)
    print(f"   [OK] Generated {len(active_rows)} data points")
    print(f"   - Deceleration: {DECELERATION_START * DELTA_T:.2f}s - {DECELERATION_END * DELTA_T:.2f}s")
    print(f"   - Freefall: {FREEFALL_START * DELTA_T:.2f}s - {FREEFALL_END * DELTA_T:.2f}s")
    print(f"   - Impact: {IMPACT_INDEX * DELTA_T:.2f}s")
    print(f"   - Post-impact: Active (person moving/recovering)")

    print("\n[SUCCESS] Mock datasets generated successfully!")


if __name__ == "__main__":
    main()
