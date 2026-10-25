#!/usr/bin/env python3
"""
RailAir Intelligence — Corridor Rail Timings Ingestion & Validation Script.

Extracts, validates, and normalizes timetable records for the 7 conventional
corridor stations from claude-rail-timings:
  MRT  <-> MTC  (Meerut City Junction)
  MMU  <-> MDNR (Modinagar)
  MNR  <-> MUD  (Muradnagar)
  GZB  <-> GZB  (Ghaziabad Junction)
  SAH  <-> SBB  (Sahibabad Junction)
  DSO  <-> DSA  (Delhi Shahdara Junction)
  NDLS <-> NDLS (New Delhi Railway Station)

Outputs:
  - src/data/mock/corridorTimetable.json (for frontend service layer)
  - backend-resources/corridor_timetable_metadata.json (audit & provenance)
"""

import csv
import json
from pathlib import Path
from collections import defaultdict

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
TIMINGS_DIR = WORKSPACE_ROOT / "backend-resources" / "claude-rail-timings"
OUTPUT_JSON = WORKSPACE_ROOT / "src" / "data" / "mock" / "corridorTimetable.json"
OUTPUT_META = WORKSPACE_ROOT / "backend-resources" / "corridor_timetable_metadata.json"

CORRIDOR_MAP = {
    "MRT": {"code": "MTC", "name": "Meerut City Junction"},
    "MMU": {"code": "MDNR", "name": "Modinagar"},
    "MNR": {"code": "MUD", "name": "Muradnagar"},
    "GZB": {"code": "GZB", "name": "Ghaziabad Junction"},
    "SAH": {"code": "SBB", "name": "Sahibabad Junction"},
    "DSO": {"code": "DSA", "name": "Delhi Shahdara Junction"},
    "NDLS": {"code": "NDLS", "name": "New Delhi Railway Station"},
}

CODE_TO_INTERNAL = {v["code"]: k for k, v in CORRIDOR_MAP.items()}


def parse_time_minutes(t_str: str):
    if not t_str or ":" not in t_str:
        return None
    try:
        parts = t_str.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, IndexError):
        return None


def calculate_duration_minutes(dep_time: str, arr_time: str, dep_day: int, arr_day: int):
    t_dep = parse_time_minutes(dep_time)
    t_arr = parse_time_minutes(arr_time)
    if t_dep is None or t_arr is None:
        return None
    
    total_dep = (dep_day - 1) * 1440 + t_dep
    total_arr = (arr_day - 1) * 1440 + t_arr
    dur = total_arr - total_dep
    
    # Handle midnight crossing without day increment
    if dur <= 0 and arr_day == dep_day and t_arr < t_dep:
        dur += 1440
        
    return dur


def extract_timings():
    print("Ingesting railway timetable data from claude-rail-timings...")
    
    # 1. Load train summaries from trains.csv
    trains_summary = {}
    trains_csv = TIMINGS_DIR / "trains.csv"
    with open(trains_csv, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            trains_summary[row["train_no"]] = row

    # 2. Load stop records from train_stops.csv
    train_stops = defaultdict(list)
    stops_csv = TIMINGS_DIR / "train_stops.csv"
    with open(stops_csv, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            st_code = row["station_code"]
            if st_code in CODE_TO_INTERNAL:
                internal_id = CODE_TO_INTERNAL[st_code]
                train_stops[row["train_no"]].append({
                    "stopSeq": int(row["stop_seq"]),
                    "stationCode": st_code,
                    "stationId": internal_id,
                    "stationName": row["station_name"],
                    "arrival": row["arrival"],
                    "departure": row["departure"],
                    "distanceKm": float(row["distance_km"]) if row["distance_km"] else 0.0,
                    "arrivalDay": int(row["arrival_day"]) if row["arrival_day"] else 1,
                    "departureDay": int(row["departure_day"]) if row["departure_day"] else 1,
                    "trainName": row["train_name"],
                    "snapshot": row["snapshot"],
                    "qualityFlag": row["quality_flag"]
                })

    # 3. Validate and filter corridor trains
    valid_trains = []
    pair_counts = defaultdict(int)
    
    for tno, stops in train_stops.items():
        if len(stops) < 2:
            continue
        
        stops.sort(key=lambda s: s["stopSeq"])
        
        # Verify stop sequence is strictly monotonic
        seqs = [s["stopSeq"] for s in stops]
        if len(seqs) != len(set(seqs)):
            continue
            
        summary = trains_summary.get(tno, {})
        q_flag = summary.get("quality_flag", "") or stops[0]["qualityFlag"]
        if "seq_conflict" in q_flag:
            continue

        # Count reachable directed pairs
        for i in range(len(stops)):
            for j in range(i + 1, len(stops)):
                pair = (stops[i]["stationId"], stops[j]["stationId"])
                pair_counts[pair] += 1

        train_record = {
            "trainNo": tno,
            "trainName": stops[0]["trainName"],
            "originStationName": summary.get("origin_station_name", "") or stops[0]["stationName"],
            "destinationStationName": summary.get("destination_station_name", "") or stops[-1]["stationName"],
            "snapshot": stops[0]["snapshot"],
            "qualityFlag": q_flag,
            "stops": stops
        }
        valid_trains.append(train_record)

    valid_trains.sort(key=lambda t: t["trainNo"])

    # 4. Output JSON for frontend application
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(valid_trains, f, indent=2)

    metadata = {
        "title": "RailAir Intelligence Corridor Historical Railway Timetable",
        "description": "Historical stop-level timetable records for the 7 Meerut-Ghaziabad-Delhi stations",
        "source": "backend-resources/claude-rail-timings/ (train_stops.csv & trains.csv)",
        "snapshots": ["2017-12-22", "2015-08-03"],
        "disclaimer": "Historical snapshot data only. Not a real-time or guaranteed schedule.",
        "corridorStations": CORRIDOR_MAP,
        "totalCorridorTrains": len(valid_trains),
        "pairConnectivity": {
            f"{k[0]}->{k[1]}": v for k, v in sorted(pair_counts.items())
        }
    }

    with open(OUTPUT_META, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Successfully extracted {len(valid_trains)} corridor trains.")
    print(f"Data saved to: {OUTPUT_JSON} ({OUTPUT_JSON.stat().st_size / 1024:.1f} KB)")
    print(f"Metadata saved to: {OUTPUT_META}")


if __name__ == "__main__":
    extract_timings()
