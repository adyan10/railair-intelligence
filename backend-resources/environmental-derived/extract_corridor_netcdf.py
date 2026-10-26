#!/usr/bin/env python3
"""
RailAir Intelligence — Corridor NetCDF Extraction Pipeline.

Extracts targeted spatial subsets from Zenodo Collection 2 (zeonodo-data2)
for the Meerut–Ghaziabad–Delhi corridor (2017–2022) without converting
the entire national 140,000-cell raster to CSV.

Uses pure Python standard library (struct, math, hashlib, json) to guarantee
reproducibility across all OS environments without requiring external C libraries.
"""

import hashlib
import json
import math
import struct
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional

# Project Paths
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
ZENODO2_DIR = WORKSPACE_ROOT / "backend-resources" / "zeonodo-data2"
OUTPUT_DIR = WORKSPACE_ROOT / "backend-resources" / "environmental-derived"

# Corridor Bounding Box (with configurable regional buffer)
DEFAULT_BOUNDS = {
    "min_lat": 28.45,  # South of Delhi/Okhla
    "max_lat": 29.20,  # North of Meerut/Modipuram
    "min_lon": 77.10,  # West of New Delhi
    "max_lon": 77.90,  # East of Meerut
}

YEARS = [2017, 2018, 2019, 2020, 2021, 2022]


def compute_sha256(file_path: Path) -> str:
    """Computes SHA-256 checksum for source file verification."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def parse_nc1_header(path: Path) -> Dict[str, Any]:
    """Parses binary NetCDF-1 Classic header."""
    with open(path, "rb") as f:
        magic = f.read(4)
        if magic not in (b"CDF\x01", b"CDF\x02"):
            raise ValueError(f"Not a valid NetCDF-1/2 file: {magic!r}")

        is_nc2 = (magic == b"CDF\x02")
        numrecs = struct.unpack(">I", f.read(4))[0]

        def read_string() -> str:
            raw_len = struct.unpack(">I", f.read(4))[0]
            padded_len = ((raw_len + 3) // 4) * 4
            s = f.read(padded_len)[:raw_len].decode("utf-8", errors="replace")
            return s

        def read_att_list() -> Dict[str, Any]:
            tag = struct.unpack(">I", f.read(4))[0]
            if tag == 0:
                struct.unpack(">I", f.read(4))[0]  # consume 0 count
                return {}
            if tag != 0x0000000C:
                return {"_error": f"Invalid att tag {hex(tag)}"}
            count = struct.unpack(">I", f.read(4))[0]
            attrs = {}
            for _ in range(count):
                aname = read_string()
                atype, alen = struct.unpack(">II", f.read(8))
                if atype == 2:  # char
                    plen = ((alen + 3) // 4) * 4
                    attrs[aname] = f.read(plen)[:alen].decode("utf-8", errors="replace")
                elif atype == 4:  # int
                    val = struct.unpack(f">{alen}i", f.read(alen * 4))
                    attrs[aname] = val[0] if alen == 1 else list(val)
                elif atype == 5:  # float
                    val = struct.unpack(f">{alen}f", f.read(alen * 4))
                    attrs[aname] = val[0] if alen == 1 else list(val)
                elif atype == 6:  # double
                    val = struct.unpack(f">{alen}d", f.read(alen * 8))
                    attrs[aname] = val[0] if alen == 1 else list(val)
                elif atype == 3:  # short
                    plen = ((alen * 2 + 3) // 4) * 4
                    val = struct.unpack(f">{alen}h", f.read(plen)[:alen * 2])
                    attrs[aname] = val[0] if alen == 1 else list(val)
                elif atype == 1:  # byte
                    plen = ((alen + 3) // 4) * 4
                    attrs[aname] = f.read(plen)[:alen]
                else:
                    attrs[aname] = f"Unsupported type {atype}"
            return attrs

        # Dimensions
        dtag = struct.unpack(">I", f.read(4))[0]
        dims = {}
        dim_names = []
        if dtag == 0x0000000A:
            dcount = struct.unpack(">I", f.read(4))[0]
            for _ in range(dcount):
                dname = read_string()
                dsize = struct.unpack(">I", f.read(4))[0]
                dims[dname] = dsize
                dim_names.append(dname)
        elif dtag != 0:
            raise ValueError(f"Invalid dim tag {hex(dtag)}")

        # Global attributes
        gatts = read_att_list()

        # Variables
        vtag = struct.unpack(">I", f.read(4))[0]
        vars_info = {}
        if vtag == 0x0000000B:
            vcount = struct.unpack(">I", f.read(4))[0]
            for _ in range(vcount):
                vname = read_string()
                vndims = struct.unpack(">I", f.read(4))[0]
                vdimids = struct.unpack(f">{vndims}I", f.read(vndims * 4)) if vndims > 0 else ()
                vatts = read_att_list()
                vtype, vsize = struct.unpack(">II", f.read(8))
                voffset = struct.unpack(">Q" if is_nc2 else ">I", f.read(8 if is_nc2 else 4))[0]

                type_names = {1: "byte", 2: "char", 3: "short", 4: "int", 5: "float", 6: "double"}
                vars_info[vname] = {
                    "ndims": vndims,
                    "dims": [dim_names[i] for i in vdimids if i < len(dim_names)],
                    "dim_ids": vdimids,
                    "attrs": vatts,
                    "data_type": type_names.get(vtype, f"type_{vtype}"),
                    "vsize": vsize,
                    "offset": voffset,
                }
        elif vtag != 0:
            raise ValueError(f"Invalid var tag {hex(vtag)}")

        return {
            "numrecs": numrecs,
            "dimensions": dims,
            "global_attributes": gatts,
            "variables": vars_info,
        }


def read_grid_coordinates(path: Path, meta: Dict[str, Any]) -> Tuple[List[float], List[float]]:
    """Reads latitude and longitude 1D coordinate vectors."""
    with open(path, "rb") as f:
        vlat = meta["variables"]["lat"]
        lat_size = meta["dimensions"]["lat"]
        f.seek(vlat["offset"])
        lats = list(struct.unpack(f">{lat_size}d", f.read(lat_size * 8)))

        vlon = meta["variables"]["lon"]
        lon_size = meta["dimensions"]["lon"]
        f.seek(vlon["offset"])
        lons = list(struct.unpack(f">{lon_size}d", f.read(lon_size * 8)))

    return lats, lons


def get_bounding_indices(
    coords: List[float], min_val: float, max_val: float
) -> Tuple[int, int, List[float]]:
    """Finds starting and ending indices for coordinate vector within [min_val, max_val]."""
    matching_indices = [i for i, c in enumerate(coords) if min_val <= c <= max_val]
    if not matching_indices:
        raise ValueError(f"No coordinates within [{min_val}, {max_val}]")
    start_idx = min(matching_indices)
    end_idx = max(matching_indices)
    subset_coords = [coords[i] for i in range(start_idx, end_idx + 1)]
    return start_idx, end_idx, subset_coords


def extract_corridor_cube(
    nc_path: Path,
    meta: Dict[str, Any],
    var_name: str,
    lat_start: int,
    lat_end: int,
    lon_start: int,
    lon_end: int,
    lats: List[float],
    lons: List[float],
    year: int,
    pollutant: str,
    checksum: str,
) -> List[Dict[str, Any]]:
    """Extracts the 3D subcube (month, lat, lon) from NetCDF file."""
    var_meta = meta["variables"][var_name]
    voffset = var_meta["offset"]
    num_lats = meta["dimensions"]["lat"]
    num_lons = meta["dimensions"]["lon"]

    records = []
    with open(nc_path, "rb") as f:
        for month_idx in range(12):
            month_num = month_idx + 1
            month_str = f"{month_num:02d}"
            iso_date = f"{year}-{month_str}-01"

            for lat_idx in range(lat_start, lat_end + 1):
                lat_val = round(lats[lat_idx], 4)
                # Compute file seek position for the contiguous row of selected longitudes
                row_offset = voffset + (
                    (month_idx * num_lats * num_lons) + (lat_idx * num_lons) + lon_start
                ) * 4
                f.seek(row_offset)
                count = (lon_end - lon_start) + 1
                row_bytes = f.read(count * 4)
                row_floats = struct.unpack(f">{count}f", row_bytes)

                for lon_rel_idx, raw_val in enumerate(row_floats):
                    lon_idx = lon_start + lon_rel_idx
                    lon_val = round(lons[lon_idx], 4)

                    val: Optional[float] = None
                    if not math.isnan(raw_val) and -9000.0 < raw_val < 9000.0 and raw_val >= 0.0:
                        val = round(float(raw_val), 2)

                    grid_id = f"grid_{lat_val:.2f}_{lon_val:.2f}"
                    rec = {
                        "id": f"{pollutant.lower()}_{grid_id}_{year}_{month_str}",
                        "grid_id": grid_id,
                        "latitude": lat_val,
                        "longitude": lon_val,
                        "pollutant": pollutant,
                        "value": val,
                        "unit": "µg/m³",
                        "year": year,
                        "month": month_num,
                        "observed_at": f"{iso_date}T00:00:00Z",
                        "observation_type": "gridded_surface_estimate",
                        "temporal_resolution": "monthly_mean",
                        "spatial_resolution": "10km",
                        "source_file": nc_path.name,
                        "source_checksum": checksum,
                        "provenance": {
                            "dataset": "zeonodo-data2",
                            "method": "Satellite AOD + Chemical Transport Model + CPCB Calibration",
                            "license": "CC-BY-4.0",
                        },
                    }
                    records.append(rec)
    return records


def run_corridor_extraction(bounds: Dict[str, float] = DEFAULT_BOUNDS) -> Dict[str, Any]:
    """Runs full reproducible extraction for PM2.5 and PM10 across 2017–2022."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Reference file for coordinate discovery
    ref_file = ZENODO2_DIR / "pm25_arr_10km_2017_monthly.nc"
    if not ref_file.exists():
        raise FileNotFoundError(f"Missing reference NetCDF: {ref_file}")

    ref_meta = parse_nc1_header(ref_file)
    lats, lons = read_grid_coordinates(ref_file, ref_meta)

    lat_start, lat_end, corridor_lats = get_bounding_indices(
        lats, bounds["min_lat"], bounds["max_lat"]
    )
    lon_start, lon_end, corridor_lons = get_bounding_indices(
        lons, bounds["min_lon"], bounds["max_lon"]
    )

    grid_cells_count = len(corridor_lats) * len(corridor_lons)
    print(f"Corridor Grid Footprint: {len(corridor_lats)} lats x {len(corridor_lons)} lons = {grid_cells_count} cells")
    print(f"Latitudes: {corridor_lats[0]:.4f} to {corridor_lats[-1]:.4f}")
    print(f"Longitudes: {corridor_lons[0]:.4f} to {corridor_lons[-1]:.4f}")

    all_pm25_records = []
    all_pm10_records = []
    file_manifest = []

    # 1. Process PM2.5
    for year in YEARS:
        nc_path = ZENODO2_DIR / f"pm25_arr_10km_2017_monthly.nc".replace("2017", str(year))
        checksum = compute_sha256(nc_path)
        meta = parse_nc1_header(nc_path)
        recs = extract_corridor_cube(
            nc_path, meta, "pm25", lat_start, lat_end, lon_start, lon_end,
            lats, lons, year, "PM2.5", checksum
        )
        all_pm25_records.extend(recs)
        file_manifest.append({
            "pollutant": "PM2.5",
            "year": year,
            "filename": nc_path.name,
            "records_extracted": len(recs),
            "sha256": checksum,
        })
        print(f"Extracted PM2.5 {year}: {len(recs)} records from {nc_path.name}")

    # 2. Process PM10
    for year in YEARS:
        nc_path = ZENODO2_DIR / "pm10_monthly" / f"pm10_arr_10km_{year}_monthly.nc"
        checksum = compute_sha256(nc_path)
        meta = parse_nc1_header(nc_path)
        recs = extract_corridor_cube(
            nc_path, meta, "pm10", lat_start, lat_end, lon_start, lon_end,
            lats, lons, year, "PM10", checksum
        )
        all_pm10_records.extend(recs)
        file_manifest.append({
            "pollutant": "PM10",
            "year": year,
            "filename": nc_path.name,
            "records_extracted": len(recs),
            "sha256": checksum,
        })
        print(f"Extracted PM10 {year}: {len(recs)} records from {nc_path.name}")

    combined_records = all_pm25_records + all_pm10_records

    # Save to generated-data directory
    output_json = OUTPUT_DIR / "corridor_pm_monthly_2017_2022.json"
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(combined_records, f, indent=2)

    metadata = {
        "title": "RailAir Corridor Monthly Gridded PM2.5 and PM10 (2017–2022)",
        "bounds": bounds,
        "grid_shape": {"lat_count": len(corridor_lats), "lon_count": len(corridor_lons), "total_cells": grid_cells_count},
        "latitudes": [round(c, 4) for c in corridor_lats],
        "longitudes": [round(c, 4) for c in corridor_lons],
        "temporal_range": {"start_year": 2017, "end_year": 2022, "total_months": 72},
        "total_records": len(combined_records),
        "pm25_records": len(all_pm25_records),
        "pm10_records": len(all_pm10_records),
        "file_manifest": file_manifest,
        "generated_file": output_json.name,
        "generated_size_bytes": output_json.stat().st_size,
    }

    metadata_path = OUTPUT_DIR / "corridor_extraction_metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nExtraction complete:")
    print(f"  Total records: {len(combined_records)}")
    print(f"  Output JSON: {output_json} ({output_json.stat().st_size / 1024:.1f} KB)")
    print(f"  Metadata: {metadata_path}")
    return metadata


if __name__ == "__main__":
    run_corridor_extraction()
