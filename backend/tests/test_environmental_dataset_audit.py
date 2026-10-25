"""Unit tests for Environmental Dataset Audit."""
import csv
import json
import pytest
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent.parent
BACKEND_RESOURCES = WORKSPACE / "backend-resources"

MENDELEY_DIR = BACKEND_RESOURCES / "mendeley-pollution-data"
DATAGOV_DIR = BACKEND_RESOURCES / "data-gov-in"
ZENODO2_DIR = BACKEND_RESOURCES / "zeonodo-data2"
ZENODO1_DIR = BACKEND_RESOURCES / "zenodo-data"
AUDIT_OUT_DIR = BACKEND_RESOURCES / "environmental-audit-output"

import sys
sys.path.insert(0, str(AUDIT_OUT_DIR))
from parse_nc1 import parse_nc1_header, read_coords


def test_source_directories_exist():
    """Verify all four environmental dataset directories exist with exact names."""
    assert MENDELEY_DIR.exists() and MENDELEY_DIR.is_dir()
    assert DATAGOV_DIR.exists() and DATAGOV_DIR.is_dir()
    assert ZENODO2_DIR.exists() and ZENODO2_DIR.is_dir()
    assert ZENODO1_DIR.exists() and ZENODO1_DIR.is_dir()


def test_file_inventory_counts():
    """Verify file counts and exact duplicate pairs."""
    m_files = list(MENDELEY_DIR.glob("*.csv"))
    assert len(m_files) == 1
    assert m_files[0].name == "MASTER DATASET 2023-25.csv"

    dg_files = list(DATAGOV_DIR.glob("*.csv"))
    assert len(dg_files) == 1
    assert dg_files[0].name == "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.csv"

    z2_files = list(ZENODO2_DIR.rglob("*.nc"))
    assert len(z2_files) == 18

    z1_files = list(ZENODO1_DIR.glob("*"))
    assert len(z1_files) == 2


def test_mendeley_pollutants_and_absence_of_pm():
    """Verify Mendeley dataset contains satellite trace gases & meteorology, but NO PM2.5/PM10."""
    csv_file = MENDELEY_DIR / "MASTER DATASET 2023-25.csv"
    with open(csv_file, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames or []

    # Expected satellite gases and ERA5 meteorology
    expected_fields = ["CO", "DewPoint", "HCHO", "NO2", "O3", "SO2", "Temperature", "Wind_U", "Wind_V", "station", ".geo", "Month", "Year", "Date"]
    for ef in expected_fields:
        assert ef in fields, f"Missing field in Mendeley dataset: {ef}"

    # Critical scientific finding: PM2.5 and PM10 are absent
    assert "PM2.5" not in fields and "pm25" not in fields and "PM25" not in fields
    assert "PM10" not in fields and "pm10" not in fields


def test_datagov_cpcb_snapshot():
    """Verify Data.gov.in contains instantaneous CPCB ground station measurements."""
    csv_file = DATAGOV_DIR / "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.csv"
    with open(csv_file, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    assert len(rows) > 3500
    pollutant_ids = set(r["pollutant_id"] for r in rows)
    expected_pollutants = {"PM2.5", "PM10", "NO2", "SO2", "CO", "OZONE", "NH3"}
    assert expected_pollutants.issubset(pollutant_ids)

    # Check that NCR cities (Delhi, Ghaziabad, Meerut) exist in ground monitor snapshot
    cities = set(r["city"] for r in rows)
    assert "Delhi" in cities
    assert "Ghaziabad" in cities
    assert "Meerut" in cities


def test_zenodo2_netcdf_dimensions_and_grid():
    """Verify Zenodo 2 NetCDF files have exact 10 km grid over India in WGS84."""
    nc_file = ZENODO2_DIR / "pm25_arr_10km_2022_monthly.nc"
    meta = parse_nc1_header(nc_file)

    assert meta["dimensions"] == {"lat": 350, "lon": 400, "month": 12}
    coords = read_coords(nc_file, meta)

    assert coords["lat_min"] == 5.0
    assert coords["lat_max"] == 40.0
    assert coords["lon_min"] == 60.0
    assert coords["lon_max"] == 100.0
    assert coords["months"] == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]


def test_zenodo2_duplicates_verified():
    """Verify that root pm25 files and pm25_monthly/ files are bitwise identical."""
    for yr in range(2017, 2023):
        root_f = ZENODO2_DIR / f"pm25_arr_10km_{yr}_monthly.nc"
        sub_f = ZENODO2_DIR / "pm25_monthly" / f"pm25_arr_10km_{yr}_monthly.nc"
        assert root_f.stat().st_size == sub_f.stat().st_size
        assert root_f.read_bytes() == sub_f.read_bytes()


def test_zenodo1_hdf5_model():
    """Verify Zenodo 1 PM2.5 model NetCDF-4/HDF5 format and cross-validation metrics."""
    nc_file = ZENODO1_DIR / "pm25-full_rel-2026-07-r0_s-1.0_mb-1.3-r0.nc"
    with open(nc_file, "rb") as f:
        magic = f.read(8)
        assert magic == b"\x89HDF\r\n\x1a\n"

    csv_file = ZENODO1_DIR / "pm25-cv-summary_rel-2026-07-r0_s-1.0_mb-1.3-r0.csv"
    with open(csv_file, "r", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
        assert len(reader) == 1
        r2 = float(reader[0]["r2"])
        rmse = float(reader[0]["rmse_ugm3"])
        assert 0.60 <= r2 <= 0.62
        assert 26.0 <= rmse <= 27.0
