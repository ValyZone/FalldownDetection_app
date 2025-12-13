import math
from pathlib import Path
import csv


HEADER = (
    "Time (s)\tAcceleration x (m/s^2)\tAcceleration y (m/s^2)\t"
    "Acceleration z (m/s^2)\tAbsolute acceleration (m/s^2)\t"
    "Gyroscope x (rad/s)\tGyroscope y (rad/s)\tGyroscope z (rad/s)\t"
    "Gyroscope magnitude (rad/s)"
)

TEST_CASES_ROOT = Path(__file__).resolve().parents[1] / "test-cases"
SOURCE_DIRS = [TEST_CASES_ROOT / "fall", TEST_CASES_ROOT / "no_fall"]


def _convert_row(row: list[str]) -> str | None:
    if len(row) < 7:
        return None

    try:
        time_s = float(row[0])
        ax = float(row[1])
        ay = float(row[2])
        az = float(row[3])
        rx_deg = float(row[4])
        ry_deg = float(row[5])
        rz_deg = float(row[6])
    except ValueError:
        return None

    svm = math.sqrt(ax * ax + ay * ay + az * az)

    rx = math.radians(rx_deg)
    ry = math.radians(ry_deg)
    rz = math.radians(rz_deg)

    gyro_mag = math.sqrt(rx * rx + ry * ry + rz * rz)

    return (
        f"{time_s:.3f}\t{ax:.6f}\t{ay:.6f}\t{az:.6f}\t{svm:.6f}\t"
        f"{rx:.6f}\t{ry:.6f}\t{rz:.6f}\t{gyro_mag:.6f}"
    )


def _normalize_file(source_path: Path, output_root: Path) -> None:
    source_dirs = [d for d in SOURCE_DIRS if source_path.is_relative_to(d)]
    if not source_dirs:
        return
    
    relative_path = source_path.relative_to(source_dirs[0].parent)
    target_path = output_root / relative_path
    target_path.parent.mkdir(parents=True, exist_ok=True)

    rows: list[str] = []
    with source_path.open("r", encoding="cp1252", newline="") as handle:
        reader = csv.reader(handle, delimiter="\t")
        for index, row in enumerate(reader):
            if index == 0:
                # Skip header
                continue

            if not row:
                continue

            cleaned = [cell.strip() for cell in row if cell.strip() != ""]
            converted = _convert_row(cleaned)
            if converted is not None:
                rows.append(converted)

    target_path.write_text("\n".join([HEADER, *rows]), encoding="ascii")


def main() -> None:
    output_root = TEST_CASES_ROOT / "normalized"
    output_root.mkdir(parents=True, exist_ok=True)

    for source_dir in SOURCE_DIRS:
        if not source_dir.exists():
            continue
        for csv_path in source_dir.rglob("*.csv"):
            if output_root in csv_path.parents:
                continue
            _normalize_file(csv_path, output_root)


if __name__ == "__main__":
    main()
