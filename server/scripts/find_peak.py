import pandas as pd

df = pd.read_csv('test-cases/normalized/fall/Fall in a curve/Fall in a curve.csv', sep='\t')
idx = df['Absolute acceleration (m/s^2)'].idxmax()
peak_val = df.loc[idx, 'Absolute acceleration (m/s^2)']
time_val = df.loc[idx, 'Time (s)']

print(f'Peak at row {idx} (line {idx+2} in file): {peak_val:.2f} m/s^2')
print(f'Time: {time_val:.3f} seconds')
print(f'Chunk number (1200 lines per chunk): {idx // 1200 + 1}')
print(f'Position in chunk: {idx % 1200}')
