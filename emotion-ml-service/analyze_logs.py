import pandas as pd
import matplotlib.pyplot as plt

LOG_FILE = "events_log.csv"

def col_mean(df, col):
    return df[col].mean() if col in df.columns else None

def main():
    df = pd.read_csv(LOG_FILE, on_bad_lines="skip")

    print("\n===== ОБЩАЯ СТАТИСТИКА =====")
    print(f"Всего событий: {len(df)}\n")

    if "state" in df.columns:
        print("Распределение состояний:")
        print(df["state"].value_counts(), "\n")

    if "fps" in df.columns:
        print(f"Средний FPS: {df['fps'].mean():.2f}")

    rt = col_mean(df, "reaction_time_sec")
    if rt is not None:
        print(f"Среднее время реакции (сек): {rt:.2f}")
    else:
        print("ℹ reaction_time_sec отсутствует в логе")

    dur = col_mean(df, "event_duration_sec")
    if dur is not None:
        print(f"Средняя длительность события (сек): {dur:.2f}")
    else:
        print("ℹ event_duration_sec отсутствует в логе")

    # ===== ВИЗУАЛИЗАЦИЯ =====
    if "risk_score" in df.columns:
        df["risk_score"].plot(kind="hist", bins=10, title="Risk score distribution")
        plt.show()

if __name__ == "__main__":
    main()
