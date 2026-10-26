"""Tests for DataMeet dataset audit utilities and validation logic."""
import pytest
import sys
from pathlib import Path

# Add backend-resources to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend-resources"))
from audit_datameet import (
    audit_file_inventory,
    audit_up_stations_csv,
    audit_up_stations_geojson,
    compare_csv_and_geojson,
    audit_zones_and_divisions,
    reconcile_canonical_stations,
    check_corridor_geometry,
    haversine_km,
)


def test_audit_file_inventory():
    inventory = audit_file_inventory()
    assert len(inventory) == 13
    filenames = [f["filename"] for f in inventory]
    assert "uttar_pradesh_railway_stations.csv" in filenames
    assert "uttar_pradesh_railway_stations.geojson" in filenames
    assert "india_railway_zones_and_divisions.csv" in filenames
    assert all(f["status"] == "OK" for f in inventory)


def test_up_stations_csv():
    csv_data = audit_up_stations_csv()
    assert csv_data["total_records"] == 70
    assert csv_data["unique_codes"] == 70
    assert len(csv_data["code_duplicates"]) == 0
    assert len(csv_data["invalid_coordinates"]) == 0
    min_lat, max_lat = csv_data["lat_range"]
    min_lon, max_lon = csv_data["lon_range"]
    assert 24.0 <= min_lat <= max_lat <= 30.5
    assert 77.0 <= min_lon <= max_lon <= 85.0


def test_up_stations_geojson():
    geo_data = audit_up_stations_geojson()
    assert geo_data["total_features"] == 46
    assert geo_data["unique_codes"] == 46
    assert len(geo_data["code_duplicates"]) == 0
    assert len(geo_data["invalid_geometries"]) == 0
    assert geo_data["crs"]["properties"]["name"] == "urn:ogc:def:crs:OGC:1.3:CRS84"


def test_csv_vs_geojson_comparison():
    csv_data = audit_up_stations_csv()
    geo_data = audit_up_stations_geojson()
    comp = compare_csv_and_geojson(csv_data, geo_data)
    assert comp["csv_count"] == 70
    assert comp["geojson_count"] == 46
    assert comp["in_csv_not_geojson_count"] == 24
    assert comp["in_geojson_not_csv_count"] == 0
    assert len(comp["coordinate_mismatches_gt_50m"]) == 0


def test_zones_and_divisions():
    zd = audit_zones_and_divisions()
    assert zd["total_zones"] == 18
    assert "NR" in zd["zone_codes"]
    assert "NCR" in zd["zone_codes"]
    assert "NER" in zd["zone_codes"]


def test_reconcile_canonical_stations():
    csv_data = audit_up_stations_csv()
    geo_data = audit_up_stations_geojson()
    reconciliation = reconcile_canonical_stations(csv_data, geo_data)
    assert len(reconciliation) == 7

    reconciled_by_id = {r["canonical_id"]: r for r in reconciliation}
    # MRT should match MTC
    assert reconciled_by_id["MRT"]["candidate_code"] == "MTC"
    assert reconciled_by_id["MRT"]["distance_km"] < 3.0

    # GZB should match GZB
    assert reconciled_by_id["GZB"]["candidate_code"] == "GZB"
    assert reconciled_by_id["GZB"]["distance_km"] < 2.0

    # NDLS is in NCT Delhi (not in UP dataset)
    assert reconciled_by_id["NDLS"]["candidate_code"] is None


def test_corridor_geometry_check():
    geom_check = check_corridor_geometry()
    assert geom_check["contains_linestring_track_geometry"] is False


def test_haversine():
    # Distance between NDLS (28.6419, 77.2194) and GZB (28.6595, 77.4246) approx ~20 km
    d = haversine_km(28.6419, 77.2194, 28.6595, 77.4246)
    assert 19.0 <= d <= 22.0
