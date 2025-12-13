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
DECELERATION_END = 425      # Deceleration lasts 0.5 seconds (25 samples) - longer for gradual change
FREEFALL_START = 425        # Freefall phase starts
FREEFALL_END = 440          # Freefall lasts 0.3 seconds (15 samples)
IMPACT_INDEX = 440          # Impact occurs at index 440
POST_IMPACT_START = 441     # Post-impact motion starts


def _baseline_motion(noise_scale: float) -> tuple[float, float, float]:
    """Generate baseline motion with gravity + small noise."""
    base_y = 9.80665
    return (
        random.gauss(0.0, noise_scale),
        base_y + random.gauss(0.0, noise_scale),
        random.gauss(0.0, noise_scale),
    )


def _deceleration_motion(progress: float, start_y: float = 9.80665, end_y: float = -5.0) -> tuple[float, float, float]:
    """Generate gradual deceleration motion.

    Progress goes from 0.0 to 1.0 during the deceleration phase.
    Creates a gradual negative acceleration (deceleration) on the Y-axis.

    With DELTA_T = 0.02s and 25 samples (0.5s total):
    - Rate of change = (end_y - start_y) / duration = (-5 - 9.8) / 0.5 = -29.6 m/s²
    - This should trigger the -15 m/s² threshold
    """
    # Linear interpolation from start_y to end_y for gradual deceleration
    current_y = start_y + (end_y - start_y) * progress

    # Very minimal noise to keep deceleration smooth and detectable
    return (
        random.gauss(0.0, 0.05),  # Minimal X noise
        current_y + random.gauss(0.0, 0.05),  # Y-axis with minimal noise
        random.gauss(0.0, 0.05),  # Minimal Z noise
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


def _synthesise_rows(is_real_fall: bool) -> list[str]:
    """Synthesize accelerometer data.

    Args:
        is_real_fall: True for positive (real fall with all three phases),
                      False for false positive (non-fall scenario like phone drop)

    Returns:
        List of CSV rows with tab-separated values
    """
    random.seed(42 if is_real_fall else 1337)
    rows: list[str] = []

    for index in range(SAMPLE_COUNT):
        time_s = index * DELTA_T

        if is_real_fall:
            # REAL FALL SCENARIO: All three phases present

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
                gx = random.gauss(0.5, 0.1)
                gy = random.gauss(0.6, 0.1)
                gz = random.gauss(0.7, 0.1)

            # Phase 3: Freefall (weightlessness)
            elif FREEFALL_START <= index < FREEFALL_END:
                progress = (index - FREEFALL_START) / (FREEFALL_END - FREEFALL_START)
                ax, ay, az = _freefall_motion(progress)
                gx = random.gauss(1.5, 0.5)
                gy = random.gauss(1.8, 0.5)
                gz = random.gauss(2.0, 0.5)

            # Phase 4: Impact (hitting the ground)
            elif index == IMPACT_INDEX:
                ax, ay, az = _impact_motion()
                gx = random.gauss(4.0, 0.5)
                gy = random.gauss(4.5, 0.5)
                gz = random.gauss(5.0, 0.5)

            # Phase 5: Post-impact (person stays still)
            else:
                ax, ay, az = _post_impact_calm()
                gx = random.gauss(0.01, 0.005)
                gy = random.gauss(0.01, 0.005)
                gz = random.gauss(0.01, 0.005)

        else:
            # FALSE POSITIVE SCENARIO: Phone dropped (impact only, no deceleration/freefall sequence)
            # This simulates someone dropping their phone - there's an impact but no fall

            # Phase 1: Normal motion
            if index < DECELERATION_START:
                ax, ay, az = _baseline_motion(0.15)
                gx = random.gauss(0.02, 0.01)
                gy = random.gauss(0.02, 0.01)
                gz = random.gauss(0.02, 0.01)

            # Phase 2: Brief acceleration spike (phone being picked up/moved)
            elif DECELERATION_START <= index < DECELERATION_START + 5:
                # Small acceleration spike, not deceleration
                ax = random.gauss(2.0, 0.5)
                ay = random.gauss(12.0, 1.0)  # Slightly higher than gravity
                az = random.gauss(2.0, 0.5)
                gx = random.gauss(0.3, 0.1)
                gy = random.gauss(0.4, 0.1)
                gz = random.gauss(0.3, 0.1)

            # Phase 3: Brief freefall-like moment (phone being dropped)
            elif DECELERATION_START + 5 <= index < DECELERATION_START + 10:
                # Very brief low acceleration (< 0.2s, too short to be detected as freefall)
                ax = random.gauss(0.0, 0.2)
                ay = random.gauss(0.0, 0.2)
                az = random.gauss(0.0, 0.2)
                gx = random.gauss(1.0, 0.3)
                gy = random.gauss(1.2, 0.3)
                gz = random.gauss(1.1, 0.3)

            # Phase 4: Impact (phone hits ground - but without prior fall sequence)
            elif index == DECELERATION_START + 10:
                # Strong impact from phone hitting ground
                ax, ay, az = _impact_motion()
                gx = random.gauss(3.0, 0.5)
                gy = random.gauss(3.5, 0.5)
                gz = random.gauss(4.0, 0.5)

            # Phase 5: Post-impact (phone lying still on ground)
            else:
                ax, ay, az = _baseline_motion(0.08)
                gx = random.gauss(0.01, 0.005)
                gy = random.gauss(0.01, 0.005)
                gz = random.gauss(0.01, 0.005)

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

    # Generate positive fall dataset (real fall with all three phases)
    print("\n1. Generating mock_crash_positive.csv (REAL FALL - should be detected)")
    positive_rows = _synthesise_rows(is_real_fall=True)
    _write_dataset(output_dir / "mock_crash_positive.csv", positive_rows)
    print(f"   [OK] Generated {len(positive_rows)} data points")
    print(f"   - Scenario: Real fall with deceleration -> freefall -> impact sequence")
    print(f"   - Deceleration: {DECELERATION_START * DELTA_T:.2f}s - {DECELERATION_END * DELTA_T:.2f}s")
    print(f"   - Freefall: {FREEFALL_START * DELTA_T:.2f}s - {FREEFALL_END * DELTA_T:.2f}s")
    print(f"   - Impact: {IMPACT_INDEX * DELTA_T:.2f}s")
    print(f"   - Expected result: FALL DETECTED")

    # Generate false positive dataset (non-fall scenario)
    print("\n2. Generating mock_crash_false_positive.csv (FALSE POSITIVE - NOT a fall)")
    false_positive_rows = _synthesise_rows(is_real_fall=False)
    _write_dataset(output_dir / "mock_crash_false_positive.csv", false_positive_rows)
    print(f"   [OK] Generated {len(false_positive_rows)} data points")
    print(f"   - Scenario: Phone dropped (impact only, no proper fall sequence)")
    print(f"   - Brief movement + very short freefall + impact")
    print(f"   - Missing: Proper deceleration phase and sustained freefall")
    print(f"   - Expected result: NO FALL DETECTED")

    print("\n[SUCCESS] Mock datasets generated successfully!")


if __name__ == "__main__":
    main()
