#!/usr/bin/env python3
"""
RailAir Intelligence — Modern Railway Data Reconciliation & Gap Filling Tool.

This script performs a 100% read-only ingestion of:
1. Primary Claude Datasets:
   - backend-resources/claude-station-data/stations_indian_railways.csv
   - backend-resources/claude-station-data/stations_all.geojson
   - backend-resources/claude-station-data/up_stations.csv
   - backend-resources/claude-station-data/up_stations.geojson
   - backend-resources/claude-station-data/stations_rrts_meerut_corridor.csv
2. Comparison DataMeet Extract:
   - backend-resources/datameet-maps/isolated_data/uttar_pradesh_railway_stations.csv
   - backend-resources/datameet-maps/isolated_data/india_railway_zones_and_divisions.csv

It outputs a clean, normalized reference dataset to:
   backend-resources/station-reference/normalized_station_registry.json
   backend-resources/station-reference/normalized_station_registry.csv
   backend-resources/station-reference/canonical_7_reconciliation.json

Execution is idempotent and safe to rerun multiple times.
"""

import csv
import json
import math
from pathlib import Path
from typing import Dict, List, Any, Optional

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
CLAUDE_DIR = WORKSPACE_ROOT / "backend-resources" / "claude-station-data"
DATAMEET_DIR = WORKSPACE_ROOT / "backend-resources" / "datameet-maps" / "isolated_data"
OUTPUT_DIR = WORKSPACE_ROOT / "backend-resources" / "station-reference"

# RailAir 7 Canonical Baseline Stations
CANONICAL_STATIONS = [
    {
        "id": "MRT",
        "name": "Meerut City Junction",
        "short_name": "Meerut",
        "lat": 28.9845,
        "lng": 77.7064,
        "type": "major",
        "expected_ir_code": "MTC",
        "division": "Delhi Division · Northern Railway",
    },
    {
        "id": "MMU",
        "name": "Modinagar",
        "short_name": "Modinagar",
        "lat": 28.8324,
        "lng": 77.5803,
        "type": "halt",
        "expected_ir_code": "MDNR",
        "division": "Delhi Division · Northern Railway",
    },
    {
        "id": "MNR",
        "name": "Muradnagar",
        "short_name": "Muradnagar",
        "lat": 28.7762,
        "lng": 77.5096,
        "type": "halt",
        "expected_ir_code": "MUD",
        "division": "Delhi Division · Northern Railway",
    },
    {
        "id": "GZB",
        "name": "Ghaziabad Junction",
        "short_name": "Ghaziabad",
        "lat": 28.6595,
        "lng": 77.4246,
        "type": "junction",
        "expected_ir_code": "GZB",
        "division": "Major Intercity Junction · Northern Railway",
    },
    {
        "id": "SAH",
        "name": "Sahibabad Junction",
        "short_name": "Sahibabad",
        "lat": 28.6838,
        "lng": 77.3613,
        "type": "junction",
        "expected_ir_code": "SBB",
        "division": "Delhi Division · Northern Railway",
    },
    {
        "id": "DSO",
        "name": "Delhi Shahdara Junction",
        "short_name": "Shahdara",
        "lat": 28.6730,
        "lng": 77.2979,
        "type": "halt",
        "expected_ir_code": "DSA",
        "division": "Delhi Division · Northern Railway",
    },
    {
        "id": "NDLS",
        "name": "New Delhi Railway Station",
        "short_name": "New Delhi",
        "lat": 28.6419,
        "lng": 77.2194,
        "type": "terminal",
        "expected_ir_code": "NDLS",
        "division": "Central Mega Terminal · Northern Railway",
    },
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two coordinates in kilometers."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0) ** 2
    return R * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def load_source_datasets():
    """Load all candidate and comparison datasets into memory."""
    # 1. Claude National CSV
    national_csv_path = CLAUDE_DIR / "stations_indian_railways.csv"
    with open(national_csv_path, "r", encoding="utf-8") as f:
        national_ir = {r["code"]: r for r in csv.DictReader(f) if r.get("code")}

    # 2. Claude UP CSV
    up_csv_path = CLAUDE_DIR / "up_stations.csv"
    with open(up_csv_path, "r", encoding="utf-8") as f:
        claude_up_rows = list(csv.DictReader(f))

    # 3. Claude RRTS CSV
    rrts_csv_path = CLAUDE_DIR / "stations_rrts_meerut_corridor.csv"
    with open(rrts_csv_path, "r", encoding="utf-8") as f:
        rrts_rows = list(csv.DictReader(f))

    # 4. DataMeet UP CSV
    dm_csv_path = DATAMEET_DIR / "uttar_pradesh_railway_stations.csv"
    with open(dm_csv_path, "r", encoding="utf-8") as f:
        dm_up = {r["code"]: r for r in csv.DictReader(f) if r.get("code")}

    return national_ir, claude_up_rows, rrts_rows, dm_up


def reconcile_canonical_seven(national_ir: Dict[str, Any], dm_up: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Perform rigorous reconciliation for RailAir's 7 canonical stations."""
    results = []

    for c in CANONICAL_STATIONS:
        cid = c["id"]
        cname = c["name"]
        clat = c["lat"]
        clng = c["lng"]
        exp_code = c["expected_ir_code"]

        # 1. Query Claude National
        cand = national_ir.get(exp_code)
        if not cand:
            results.append({
                "canonical_id": cid,
                "canonical_name": cname,
                "canonical_lat": clat,
                "canonical_lng": clng,
                "official_ir_code": None,
                "match_name": None,
                "candidate_lat": None,
                "candidate_lng": None,
                "distance_km": None,
                "in_claude_dataset": False,
                "in_datameet_extract": False,
                "match_confidence": "NONE",
                "recommended_action": "Retain synthetic seed; manual survey required.",
            })
            continue

        cand_lat = float(cand["latitude"])
        cand_lng = float(cand["longitude"])
        dist = haversine_km(clat, clng, cand_lat, cand_lng)

        # 2. Check DataMeet presence
        in_dm = exp_code in dm_up or cid in dm_up
        dm_record = dm_up.get(exp_code) or dm_up.get(cid)

        # 3. Assess confidence
        if dist < 1.0:
            confidence = "HIGH (Exact IR Code & Delta < 1.0 km)"
        elif dist < 3.5:
            confidence = "HIGH (Exact IR Code & Delta < 3.5 km)"
        else:
            confidence = "MEDIUM (Coordinate variance requires review)"

        action = (
            f"Preserve stable RailAir ID '{cid}'. Map official IR code '{exp_code}'. "
            f"Adopt surveyed coordinates ({cand_lat:.6f}, {cand_lng:.6f}) in PostGIS reference registry."
        )

        results.append({
            "canonical_id": cid,
            "canonical_name": cname,
            "canonical_lat": clat,
            "canonical_lng": clng,
            "official_ir_code": exp_code,
            "match_name": cand.get("name"),
            "candidate_lat": cand_lat,
            "candidate_lng": cand_lng,
            "distance_km": round(dist, 3),
            "in_claude_dataset": True,
            "in_datameet_extract": in_dm,
            "datameet_coords": (float(dm_record["latitude"]), float(dm_record["longitude"])) if dm_record else None,
            "match_confidence": confidence,
            "state": cand.get("state") or ("Uttar Pradesh" if exp_code not in ("DSA", "NDLS") else "Delhi NCT"),
            "zone": cand.get("zone") or "NR",
            "recommended_action": action,
        })

    return results


def build_normalized_registry(
    national_ir: Dict[str, Any],
    claude_up_rows: List[Dict[str, Any]],
    rrts_rows: List[Dict[str, Any]],
    dm_up: Dict[str, Any],
    reconciled_7: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Build a unified, normalized station reference registry covering:
    1. The 7 Canonical Corridor Stations (mapped to official codes, preserved internal IDs).
    2. All 14 Corridor RRTS and Meerut Metro Stations (distinct transit identity, linked nearest IR).
    3. Regional Uttar Pradesh stations from Claude up_stations.csv (~1,227 IR stations).
    4. Key Delhi NCT hub stations connecting to the Meerut-Delhi corridor (e.g. NDLS, DSA, DLI, ANVT, NZM).
    """
    registry = []
    seen_keys = set()  # (system, code_or_name)

    canonical_by_exp_code = {r["official_ir_code"]: r for r in reconciled_7}

    # 1. Add Canonical 7 Stations first
    for rec in reconciled_7:
        cid = rec["canonical_id"]
        exp_code = rec["official_ir_code"]
        key = ("Indian Railways", exp_code)
        seen_keys.add(key)

        registry.append({
            "id": cid,
            "ir_code": exp_code,
            "name": rec["canonical_name"],
            "short_name": rec["canonical_name"].split()[0],
            "system": "Indian Railways",
            "station_type": next(c["type"] for c in CANONICAL_STATIONS if c["id"] == cid),
            "state": rec["state"],
            "district": "Meerut" if cid == "MRT" else ("Ghaziabad" if cid in ("MMU", "MNR", "GZB", "SAH") else "Delhi"),
            "zone": rec["zone"],
            "division": "Delhi Division · Northern Railway",
            "latitude": rec["candidate_lat"],
            "longitude": rec["candidate_lng"],
            "has_valid_coords": True,
            "coordinate_anomaly": False,
            "match_basis": "canonical corridor reconciliation",
            "is_canonical_corridor": True,
            "nearest_ir_code": None,
            "nearest_ir_km": None,
            "source_provenance": "Claude stations_indian_railways.csv reconciled with RailAir canonical baseline",
            "reconciliation_notes": f"Reconciled from internal ID {cid} to official IR code {exp_code}. Coordinate distance to mock seed: {rec['distance_km']} km.",
        })

    # 2. Add RRTS and Meerut Metro Stations (14 stations)
    for r in rrts_rows:
        rname = r["name"].strip()
        system = r["system"].strip()
        key = (system, rname)
        if key in seen_keys:
            continue
        seen_keys.add(key)

        slug = rname.lower().replace(" ", "-")
        station_id = f"RRTS-{slug.upper()}" if system == "RRTS" else f"METRO-{slug.upper()}"

        state = "Delhi NCT" if "Ashok Nagar" in rname else "Uttar Pradesh"
        district = "East Delhi" if state == "Delhi NCT" else ("Meerut" if "Meerut" in rname or rname in ("Begumpul", "Brahmapuri", "Shatabdi Nagar", "Modipuram") else "Ghaziabad")

        lat = float(r["latitude"])
        lng = float(r["longitude"])

        registry.append({
            "id": station_id,
            "ir_code": None,
            "name": rname,
            "short_name": rname,
            "system": system,
            "station_type": "rrts_station" if system == "RRTS" else "metro_station",
            "state": state,
            "district": district,
            "zone": "NCRTC",
            "division": "Delhi–Meerut RRTS Corridor",
            "latitude": lat,
            "longitude": lng,
            "has_valid_coords": True,
            "coordinate_anomaly": False,
            "match_basis": "RRTS corridor manifest",
            "is_canonical_corridor": False,
            "nearest_ir_code": r.get("nearest_ir_code"),
            "nearest_ir_km": float(r.get("nearest_ir_km")) if r.get("nearest_ir_km") else None,
            "source_provenance": r.get("source", "Claude stations_rrts_meerut_corridor.csv"),
            "reconciliation_notes": f"High-speed regional rail / metro facility. Physically distinct from conventional IR {r.get('nearest_ir_code')} ({r.get('nearest_ir_km')} km away).",
        })

    # 3. Add Regional UP Stations from Claude up_stations.csv
    for r in claude_up_rows:
        code = r.get("code", "").strip()
        name = r.get("name", "").strip()
        if not code:
            # Skip empty codes here (handled by RRTS section above)
            continue

        key = ("Indian Railways", code)
        if key in seen_keys:
            continue
        seen_keys.add(key)

        lat = float(r["latitude"])
        lng = float(r["longitude"])
        district = r.get("district_2011", "")
        zone = r.get("zone", "")
        basis = r.get("match_basis", "")

        has_valid = not (lat == 0.0 and lng == 0.0)
        anomaly = not has_valid or ("outside UP" in basis) or not (23.5 <= lat <= 31.0 and 76.5 <= lng <= 85.0)

        # Check if in old DataMeet
        dm_rec = dm_up.get(code)
        notes = f"Present in Claude UP dataset (match_basis: '{basis}')."
        if dm_rec:
            notes += " Verified against DataMeet 70-major UP extract."
        if anomaly:
            notes += f" Coordinate anomaly detected: basis='{basis}', lat={lat}, lng={lng}."

        registry.append({
            "id": f"IR-{code}",
            "ir_code": code,
            "name": name.title(),
            "short_name": name.title().split()[0],
            "system": "Indian Railways",
            "station_type": "regional_station",
            "state": "Uttar Pradesh",
            "district": district,
            "zone": zone,
            "division": "",
            "latitude": lat,
            "longitude": lng,
            "has_valid_coords": has_valid,
            "coordinate_anomaly": anomaly,
            "match_basis": basis,
            "is_canonical_corridor": False,
            "nearest_ir_code": None,
            "nearest_ir_km": None,
            "source_provenance": r.get("source", "DataMeet railways via Claude up_stations.csv"),
            "reconciliation_notes": notes,
        })

    # 4. Add Key Delhi NCT Hub Stations from National IR
    key_delhi_codes = ["DLI", "ANVT", "NZM", "TKJ", "CSB", "SVE", "DSJ"]
    for code in key_delhi_codes:
        key = ("Indian Railways", code)
        if key in seen_keys:
            continue
        cand = national_ir.get(code)
        if cand:
            seen_keys.add(key)
            registry.append({
                "id": f"IR-{code}",
                "ir_code": code,
                "name": cand["name"].title(),
                "short_name": cand["name"].title().split()[0],
                "system": "Indian Railways",
                "station_type": "terminal" if code in ("DLI", "ANVT", "NZM") else "halt",
                "state": "Delhi NCT",
                "district": "Delhi",
                "zone": cand.get("zone", "NR"),
                "division": "Delhi Division · Northern Railway",
                "latitude": float(cand["latitude"]),
                "longitude": float(cand["longitude"]),
                "has_valid_coords": True,
                "coordinate_anomaly": False,
                "match_basis": "national IR inventory",
                "is_canonical_corridor": False,
                "nearest_ir_code": None,
                "nearest_ir_km": None,
                "source_provenance": "Claude stations_indian_railways.csv",
                "reconciliation_notes": "Delhi NCT mainline passenger node connecting to Meerut-Delhi corridor.",
            })

    return registry


def save_registry_outputs(registry: List[Dict[str, Any]], reconciled_7: List[Dict[str, Any]]):
    """Write normalized output datasets to backend-resources/station-reference/."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Save canonical 7 reconciliation JSON
    recon_json_path = OUTPUT_DIR / "canonical_7_reconciliation.json"
    with open(recon_json_path, "w", encoding="utf-8") as f:
        json.dump(reconciled_7, f, indent=2)

    # 2. Save full normalized registry JSON
    reg_json_path = OUTPUT_DIR / "normalized_station_registry.json"
    with open(reg_json_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

    # 3. Save full normalized registry CSV
    reg_csv_path = OUTPUT_DIR / "normalized_station_registry.csv"
    fieldnames = [
        "id", "ir_code", "name", "short_name", "system", "station_type",
        "state", "district", "zone", "division", "latitude", "longitude",
        "has_valid_coords", "coordinate_anomaly", "match_basis",
        "is_canonical_corridor", "nearest_ir_code", "nearest_ir_km",
        "source_provenance", "reconciliation_notes"
    ]
    with open(reg_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in registry:
            writer.writerow(row)

    print(f"Successfully generated normalized station reference outputs in {OUTPUT_DIR}:")
    print(f" - {recon_json_path.name}: 7 canonical corridor stations")
    print(f" - {reg_json_path.name}: {len(registry)} normalized station records")
    print(f" - {reg_csv_path.name}: {len(registry)} normalized station records")


def main():
    print("=" * 80)
    print("RailAir Intelligence — Modern Railway Data Reconciliation & Gap Filling")
    print("=" * 80)

    national_ir, claude_up_rows, rrts_rows, dm_up = load_source_datasets()
    print(f"Loaded {len(national_ir)} national IR stations from Claude CSV.")
    print(f"Loaded {len(claude_up_rows)} UP records from Claude CSV.")
    print(f"Loaded {len(rrts_rows)} RRTS/Metro stations from Claude CSV.")
    print(f"Loaded {len(dm_up)} legacy UP stations from DataMeet extract.")

    reconciled_7 = reconcile_canonical_seven(national_ir, dm_up)
    print(f"\nReconciled {len(reconciled_7)} canonical corridor stations.")

    registry = build_normalized_registry(national_ir, claude_up_rows, rrts_rows, dm_up, reconciled_7)
    print(f"Constructed normalized reference registry with {len(registry)} stations.")

    save_registry_outputs(registry, reconciled_7)
    print("\nTransformation completed successfully with zero mutations to source files.")


if __name__ == "__main__":
    main()
