import pandas as pd
import os

# Analyze fall datasets
fall_dir = "test-cases/normalized/fall"

for scenario in os.listdir(fall_dir):
    scenario_path = os.path.join(fall_dir, scenario)
    if os.path.isdir(scenario_path):
        for file in os.listdir(scenario_path):
            if file.endswith('.csv'):
                filepath = os.path.join(scenario_path, file)
                df = pd.read_csv(filepath, sep='\t')
                peak_svm = df['Absolute acceleration (m/s^2)'].max()
                peak_g = peak_svm / 9.81
                print(f"{scenario}: Peak = {peak_svm:.2f} m/s² ({peak_g:.2f}g)")
                break  # Only check one file per scenario
