import csv
import math
from pathlib import Path

DATASET = Path('test-cases/normalized/Fall Like manoeuvre 1/Fall Like manoeuvre 1.csv')

max_svm = -math.inf
max_time = None

with DATASET.open('r', encoding='utf-8') as handle:
    reader = csv.reader(handle, delimiter='\t')
    header = next(reader)
    for row in reader:
        if not row:
            continue
        time = float(row[0])
        svm = float(row[4])
        if svm > max_svm:
            max_svm = svm
            max_time = time

print(f'Max SVM: {max_svm:.3f} m/s^2 at {max_time:.3f}s')
print(f'Equivalent G: {max_svm / 9.80665:.3f} g')
