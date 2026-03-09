#!/usr/bin/env python3
"""
Отправка сохранённого отчёта сессии (session_*.json) в ELAS backend.

Использование:
  python scripts/push_session_summary_to_backend.py <session_uuid> [path_to_json]
  или
  python scripts/push_session_summary_to_backend.py <session_uuid>  # ищет session_<uuid>_*.json в текущей папке

Переменные окружения:
  ELAS_BACKEND_URL  — базовый URL бэкенда (например https://your-api.onrender.com)
  ELAS_TOKEN        — JWT токен (преподаватель или admin)
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Optional

try:
    import requests
except ImportError:
    print("Установите requests: pip install requests", file=sys.stderr)
    sys.exit(1)


def find_session_json(session_id: str, directory: str = ".") -> Optional[str]:
    """Найти файл session_<session_id>_*.json в каталоге."""
    directory = Path(directory)
    if not directory.is_dir():
        return None
    for path in directory.glob(f"session_{session_id}_*.json"):
        return str(path)
    return None


def python_summary_to_backend_format(data: dict) -> dict:
    """Преобразовать JSON из export_session_to_json в формат POST /sessions/:id/analytics/ingest."""
    averages = data.get("averages") or {}
    start_time = data.get("start_time", "")
    end_time = data.get("end_time", "")
    duration_seconds = float(data.get("duration_seconds", 0))
    engagement = float(averages.get("engagement", 0))
    stress = float(averages.get("stress", 0))
    fatigue = float(averages.get("fatigue", 0))
    stability = float(averages.get("stability", 0))
    risk = float(averages.get("risk", 0))

    attention_drops_raw = data.get("attention_drops") or []
    attention_drops = []
    for drop in attention_drops_raw:
        if isinstance(drop, dict):
            duration_sec = drop.get("duration_sec") or drop.get("duration") or 0
            t = drop.get("start_time") or drop.get("t") or 0
            if isinstance(t, str) and hasattr(drop, "get"):
                t = 0
            severity = "moderate"
            if duration_sec > 60:
                severity = "severe"
            elif duration_sec < 15:
                severity = "mild"
            attention_drops.append({
                "t": t if isinstance(t, (int, float)) else 0,
                "duration": duration_sec,
                "severity": severity,
                "note": drop.get("note") or drop.get("participant_label"),
            })

    return {
        "sessionId": data.get("session_id"),
        "startedAt": start_time,
        "endedAt": end_time,
        "durationSeconds": round(duration_seconds, 1),
        "metrics": {
            "avgEngagement": round(engagement, 3),
            "avgStress": round(stress, 3),
            "avgFatigue": round(fatigue, 3),
            "stability": round(stability, 3),
        },
        "dominantEmotion": "neutral",
        "group": {
            "engagement": round(engagement, 3),
            "stress": round(stress, 3),
            "fatigue": round(fatigue, 3),
            "tzState": "stable",
            "groupState": "low_engagement" if engagement < 0.5 else "high_engagement",
            "emotionDistribution": {},
        },
        "attentionDrops": attention_drops,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Push session summary JSON to ELAS backend")
    parser.add_argument("session_id", help="Session UUID (ELAS session id)")
    parser.add_argument("json_path", nargs="?", help="Path to session_*.json (optional)")
    parser.add_argument("--url", default=os.environ.get("ELAS_BACKEND_URL"), help="Backend base URL")
    parser.add_argument("--token", default=os.environ.get("ELAS_TOKEN"), help="JWT token")
    args = parser.parse_args()

    session_id = args.session_id.strip()
    json_path = args.json_path
    if not json_path:
        json_path = find_session_json(session_id, ".")
        if not json_path:
            json_path = find_session_json(session_id, os.path.dirname(__file__) or ".")
    if not json_path or not Path(json_path).is_file():
        print(f"Файл не найден: {args.json_path or 'session_' + session_id + '_*.json'}", file=sys.stderr)
        return 1

    url = (args.url or "").rstrip("/")
    token = args.token
    if not url:
        print("Задайте ELAS_BACKEND_URL или --url", file=sys.stderr)
        return 1
    if not token:
        print("Задайте ELAS_TOKEN или --token", file=sys.stderr)
        return 1

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    payload = python_summary_to_backend_format(data)
    payload["sessionId"] = session_id

    ingest_url = f"{url}/sessions/{session_id}/analytics/ingest"
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

    try:
        r = requests.post(ingest_url, json=payload, headers=headers, timeout=15)
        if r.status_code in (200, 201):
            print("OK: сводка отправлена в бэкенд.")
            return 0
        print(f"Ошибка {r.status_code}: {r.text}", file=sys.stderr)
        return 1
    except requests.RequestException as e:
        print(f"Сетевая ошибка: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
