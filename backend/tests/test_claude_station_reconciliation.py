"""Unit tests for Claude railway station reconciliation, RRTS separation, and registry gap filling."""
import csv
import json
import pytest
from pathlib import Path

# Paths
WORKSPACE = Path(__file__).resolve().parent.parent.parent
CLAUDE_DIR = WORKSPACE / "backend-resources" / "claude-station-data"
DATAMEET_DIR = WORKSPACE / "backend-resources" / "datameet-maps" / "isolated_data"
REF_DIR = WORKSPACE / "backend-resources" / "station-reference"

import sys
sys.path.insert(0, str(WORKSPACE / "backend-resources"))
from transform_station_registry import (
    load_source_datasets,
    reconcile_canonical_seven,
    build_normalized_registry,
    haversine_km,
    CANONICAL_STATIONS,
)


def test_source_files_exist():
    """Verify all candidate and comparison source files exist and are non-empty."""
    expected_claude_files = [
        "stations_all.geojson",
        "stations_indian_railways.csv",
        "stations_rrts_meerut_corridor.csv",
        "up_stations.csv",
        "up_stations.geojson",
    ]
    for fn in expected_claude_files:
        p = CLAUDE_DIR / fn
        assert p.exists(), f"Missing Claude dataset file: {fn}"
        assert p.stat().st_size > 0, f"Empty Claude dataset file: {fn}"


def test_canonical_seven_reconciliation():
    """Verify all 7 RailAir canonical stations reconcile to their official IR codes with < 3.5 km distance."""
    national_ir, claude_up_rows, rrts_rows, dm_up = load_source_datasets()
    reconciled = reconcile_canonical_seven(national_ir, dm_up)

    assert len(reconciled) == 7
    reconciled_map = {r["canonical_id"]: r for r in reconciled}

    # Verify ID preservation and official IR code mappings
    expected_mappings = {
        "MRT": "MTC",
        "MMU": "MDNR",
        "MNR": "MUD",
        "GZB": "GZB",
        "SAH": "SBB",
        "DSO": "DSA",
        "NDLS": "NDLS",
    }

    for cid, exp_code in expected_mappings.items():
        rec = reconciled_map[cid]
        assert rec["official_ir_code"] == exp_code, f"Mismatch for {cid}: got {rec['official_ir_code']}"
        assert rec["in_claude_dataset"] is True
        assert rec["distance_km"] < 3.5, f"Distance too large for {cid}: {rec['distance_km']} km"
        assert rec["match_confidence"].startswith("HIGH")

    # Verify gap-filling: stations omitted from DataMeet UP extract are now found in Claude dataset
    omitted_in_datameet = ["MMU", "MNR", "SAH", "DSO", "NDLS"]
    for cid in omitted_in_datameet:
        rec = reconciled_map[cid]
        assert rec["in_datameet_extract"] is False, f"Expected {cid} to be omitted in DataMeet UP extract"
        assert rec["in_claude_dataset"] is True, f"Expected {cid} to be present in Claude dataset"


def test_rrts_conventional_separation():
    """Verify conventional rail and RRTS/Metro stations maintain distinct identities."""
    national_ir, claude_up_rows, rrts_rows, dm_up = load_source_datasets()
    reconciled = reconcile_canonical_seven(national_ir, dm_up)
    registry = build_normalized_registry(national_ir, claude_up_rows, rrts_rows, dm_up, reconciled)

    # Filter RRTS stations
    rrts_entries = [r for r in registry if r["system"] in ("RRTS", "Meerut Metro")]
    assert len(rrts_entries) == 14

    # Check Sahibabad RRTS vs Sahibabad IR
    sah_rrts = next(r for r in rrts_entries if r["name"] == "Sahibabad")
    sah_ir = next(r for r in registry if r["id"] == "SAH")

    assert sah_rrts["id"] == "RRTS-SAHIBABAD"
    assert sah_rrts["system"] == "RRTS"
    assert sah_rrts["ir_code"] is None
    assert sah_rrts["nearest_ir_code"] == "SBB"
    assert sah_rrts["nearest_ir_km"] == 0.73

    assert sah_ir["id"] == "SAH"
    assert sah_ir["system"] == "Indian Railways"
    assert sah_ir["ir_code"] == "SBB"

    # Verify physical separation distance between the two facilities
    dist = haversine_km(sah_rrts["latitude"], sah_rrts["longitude"], sah_ir["latitude"], sah_ir["longitude"])
    assert 0.6 <= dist <= 1.2


def test_normalized_registry_integrity():
    """Verify normalized registry structure, uniqueness of IDs, and coordinate bounds."""
    reg_json_path = REF_DIR / "normalized_station_registry.json"
    assert reg_json_path.exists()

    with open(reg_json_path, "r", encoding="utf-8") as f:
        registry = json.load(f)

    assert len(registry) == 1249

    ids = [r["id"] for r in registry]
    assert len(ids) == len(set(ids)), "Duplicate station IDs found in registry!"

    # Verify data quality flags
    valid_coord_stations = [r for r in registry if r["has_valid_coords"]]
    zero_coord_stations = [r for r in registry if not r["has_valid_coords"]]

    assert len(valid_coord_stations) == 1243
    assert len(zero_coord_stations) == 6  # The 6 upstream unmapped UP stations (ARX, GOV, KIE, MQW, NXR, SAHA)
    assert set(r["ir_code"] for r in zero_coord_stations) == {"ARX", "GOV", "KIE", "MQW", "NXR", "SAHA"}

    # All canonical corridor stations and RRTS stations MUST have valid coordinates
    corridor_stations = [r for r in registry if r["is_canonical_corridor"] or r["system"] in ("RRTS", "Meerut Metro")]
    assert all(r["has_valid_coords"] for r in corridor_stations)

    # Verify all valid coordinates fall within expected bounding box
    for r in valid_coord_stations:
        lat = r["latitude"]
        lng = r["longitude"]
        assert lat != 0.0 and lng != 0.0, f"Zero coordinate in {r['id']}"
        # Chitta Halt (CHTT) is in Karnataka (17.82 N); all others in northern India (23.5 - 31.0 N)
        if r["ir_code"] != "CHTT":
            assert 23.5 <= lat <= 31.0, f"Latitude out of bounds in {r['id']}: {lat}"
            assert 76.5 <= lng <= 85.0, f"Longitude out of bounds in {r['id']}: {lng}"
        assert r["system"] in ("Indian Railways", "RRTS", "Meerut Metro")


def test_pollution_boundary_preserved():
    """Ensure no pollution measurements or fabricated environmental fields exist in reference registry."""
    reg_json_path = REF_DIR / "normalized_station_registry.json"
    with open(reg_json_path, "r", encoding="utf-8") as f:
        registry = json.load(f)

    forbidden_fields = {"pm25", "pm10", "no2", "co", "aqi", "pollution", "observations"}
    for r in registry:
        for k in r.keys():
            assert k.lower() not in forbidden_fields, f"Forbidden environmental field found in {r['id']}: {k}"
