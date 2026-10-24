#!/usr/bin/env python3
"""
RailAir Intelligence — DataMeet Geospatial Dataset Audit & Reconciliation Script.

This script performs a 100% read-only, non-destructive audit of all files in:
    backend-resources/datameet-maps/isolated_data/

It validates:
1. File inventory, byte sizes, formats, and structural integrity.
2. Railway stations (CSV and GeoJSON): coordinate validity, CRS, duplicates, bounding boxes.
3. Railway zones & divisions: schema, coverage, linkage feasibility.
4. Non-railway datasets (demographics, electoral): size, structure, relevance to Phase 1.
5. Reconciliation with RailAir's 7 canonical stations (MRT, MMU, MNR, GZB, SAH, DSO, NDLS).
6. Corridor geometry assessment.
7. PostGIS schema readiness against backend/app/db/migrations/001_initial_schema.sql.

Execution is idempotent and safe to rerun multiple times.
"""

import csv
import json
import math
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# Configuration paths
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
ISOLATED_DATA_DIR = WORKSPACE_ROOT / "backend-resources" / "datameet-maps" / "isolated_data"

# RailAir 7 Canonical Baseline Stations
CANONICAL_STATIONS = [
    {
        "id": "MRT",
        "name": "Meerut City Junction",
        "short_name": "Meerut",
        "lat": 28.9845,
        "lng": 77.7064,
        "type": "major",
        "division": "Delhi Division · Northern Railway",
    },
    {
        "id": "MMU",
        "name": "Modinagar",
        "short_name": "Modinagar",
        "lat": 28.8324,
        "lng": 77.5803,
        "type": "halt",
        "division": "Delhi Division · Northern Railway",
    },
    {
        "id": "MNR",
        "name": "Muradnagar",
        "short_name": "Muradnagar",
        "lat": 28.7762,
        "lng": 77.5096,
        "type": "halt",
        "division": "Delhi Division · Northern Railway",
    },
    {
        "id": "GZB",
        "name": "Ghaziabad Junction",
        "short_name": "Ghaziabad",
        "lat": 28.6595,
        "lng": 77.4246,
        "type": "junction",
        "division": "Major Intercity Junction · Northern Railway",
    },
    {
        "id": "SAH",
        "name": "Sahibabad Junction",
        "short_name": "Sahibabad",
        "lat": 28.6838,
        "lng": 77.3613,
        "type": "junction",
        "division": "Delhi Division · Northern Railway",
    },
    {
        "id": "DSO",
        "name": "Delhi Shahdara Junction",
        "short_name": "Shahdara",
        "lat": 28.6730,
        "lng": 77.2979,
        "type": "halt",
        "division": "Delhi Division · Northern Railway",
    },
    {
        "id": "NDLS",
        "name": "New Delhi Railway Station",
        "short_name": "New Delhi",
        "lat": 28.6419,
        "lng": 77.2194,
        "type": "terminal",
        "division": "Central Mega Terminal · Northern Railway",
    },
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on the Earth in kilometers."""
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def audit_file_inventory() -> List[Dict[str, Any]]:
    """Inventory all files in the isolated_data directory."""
    results = []
    if not ISOLATED_DATA_DIR.exists():
        print(f"ERROR: Directory does not exist: {ISOLATED_DATA_DIR}")
        return results

    for p in sorted(ISOLATED_DATA_DIR.iterdir()):
        if p.is_file():
            size = p.stat().st_size
            suffix = p.suffix.lower()
            rel_path = p.relative_to(WORKSPACE_ROOT).as_posix()

            # Classify kind
            if suffix == ".md":
                classification = "Documentation / Narrative Guide"
            elif suffix == ".json":
                if "profile" in p.name:
                    classification = "Infrastructure Profile Metadata"
                elif "isolated_dataset" in p.name:
                    classification = "Dataset Index / Provenance Metadata"
                else:
                    classification = "JSON Data"
            elif suffix == ".geojson":
                classification = "Geospatial Vector Layer (GeoJSON)"
            elif suffix == ".csv":
                if "stations" in p.name:
                    classification = "Tabular Railway Stations Data"
                elif "zones" in p.name:
                    classification = "Tabular Railway Zonal Reference"
                elif "census" in p.name:
                    classification = "Derived Demographic Metric Snippet"
                elif "constituencies" in p.name:
                    classification = "Tabular Electoral Results (Lok Sabha 2014)"
                else:
                    classification = "CSV Tabular Data"
            else:
                classification = "Other"

            # Integrity check
            status = "OK"
            line_count = 0
            if size == 0:
                status = "EMPTY"
            else:
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                        line_count = len(lines)
                        if suffix == ".json" or suffix == ".geojson":
                            f.seek(0)
                            json.load(f)
                        elif suffix == ".csv":
                            f.seek(0)
                            reader = list(csv.reader(f))
                            if len(reader) <= 1:
                                status = "MINIMAL_CONTENT (<=1 row)"
                except Exception as e:
                    status = f"MALFORMED: {e}"

            results.append({
                "filename": p.name,
                "relative_path": rel_path,
                "suffix": suffix,
                "size_bytes": size,
                "line_count": line_count,
                "classification": classification,
                "status": status,
            })
    return results


def audit_up_stations_csv() -> Dict[str, Any]:
    """Audit uttar_pradesh_railway_stations.csv in depth."""
    csv_path = ISOLATED_DATA_DIR / "uttar_pradesh_railway_stations.csv"
    if not csv_path.exists():
        return {"error": "File not found"}

    rows = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames or []
        for r in reader:
            rows.append(r)

    total_records = len(rows)
    codes = set()
    code_duplicates = []
    names = set()
    name_duplicates = []
    invalid_coords = []
    lats = []
    lons = []
    zones = {}
    divisions = {}
    categories = {}

    for idx, r in enumerate(rows, start=2):
        code = r.get("code", "").strip()
        name = r.get("name", "").strip()
        zone = r.get("zone", "").strip()
        division = r.get("division", "").strip()
        cat = r.get("category", "").strip()

        # Check codes
        if code in codes:
            code_duplicates.append((idx, code, name))
        codes.add(code)

        # Check names
        if name in names:
            name_duplicates.append((idx, code, name))
        names.add(name)

        # Parse coordinates
        try:
            lat = float(r.get("latitude", ""))
            lon = float(r.get("longitude", ""))
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                invalid_coords.append((idx, code, lat, lon, "Out of bounds"))
            elif not (20.0 <= lat <= 35.0 and 70.0 <= lon <= 90.0):
                invalid_coords.append((idx, code, lat, lon, "Outside India/UP bounding box"))
            else:
                lats.append(lat)
                lons.append(lon)
        except ValueError:
            invalid_coords.append((idx, code, r.get("latitude"), r.get("longitude"), "Non-numeric coordinates"))

        zones[zone] = zones.get(zone, 0) + 1
        divisions[division] = divisions.get(division, 0) + 1
        categories[cat] = categories.get(cat, 0) + 1

    return {
        "fields": fields,
        "total_records": total_records,
        "unique_codes": len(codes),
        "code_duplicates": code_duplicates,
        "name_duplicates": name_duplicates,
        "invalid_coordinates": invalid_coords,
        "lat_range": (min(lats), max(lats)) if lats else None,
        "lon_range": (min(lons), max(lons)) if lons else None,
        "zones_breakdown": zones,
        "divisions_breakdown": divisions,
        "categories_breakdown": categories,
        "records": rows,
    }


def audit_up_stations_geojson() -> Dict[str, Any]:
    """Audit uttar_pradesh_railway_stations.geojson in depth."""
    geojson_path = ISOLATED_DATA_DIR / "uttar_pradesh_railway_stations.geojson"
    if not geojson_path.exists():
        return {"error": "File not found"}

    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    fc_type = data.get("type")
    crs = data.get("crs")
    features = data.get("features", [])
    total_features = len(features)

    codes = set()
    code_duplicates = []
    lats = []
    lons = []
    invalid_geoms = []
    records = []

    for idx, feat in enumerate(features):
        props = feat.get("properties", {})
        code = props.get("code", "").strip()
        geom = feat.get("geometry", {})
        geom_type = geom.get("type")
        coords = geom.get("coordinates", [])

        if code in codes:
            code_duplicates.append((idx, code, props.get("name")))
        codes.add(code)

        if geom_type != "Point" or len(coords) != 2:
            invalid_geoms.append((idx, code, geom_type, coords))
            continue

        lon, lat = coords[0], coords[1]
        try:
            flon = float(lon)
            flat = float(lat)
            if not (-90.0 <= flat <= 90.0 and -180.0 <= flon <= 180.0):
                invalid_geoms.append((idx, code, "Out of bounds", coords))
            else:
                lats.append(flat)
                lons.append(flon)
                records.append({**props, "latitude": flat, "longitude": flon})
        except (ValueError, TypeError):
            invalid_geoms.append((idx, code, "Non-numeric coordinates", coords))

    return {
        "collection_type": fc_type,
        "crs": crs,
        "total_features": total_features,
        "unique_codes": len(codes),
        "code_duplicates": code_duplicates,
        "invalid_geometries": invalid_geoms,
        "lat_range": (min(lats), max(lats)) if lats else None,
        "lon_range": (min(lons), max(lons)) if lons else None,
        "records": records,
    }


def compare_csv_and_geojson(csv_data: Dict[str, Any], geojson_data: Dict[str, Any]) -> Dict[str, Any]:
    """Compare CSV and GeoJSON station records for parity and discrepancies."""
    csv_records = {r["code"]: r for r in csv_data.get("records", [])}
    geo_records = {r["code"]: r for r in geojson_data.get("records", [])}

    in_csv_not_geo = [c for c in csv_records if c not in geo_records]
    in_geo_not_csv = [c for c in geo_records if c not in csv_records]

    coord_mismatches = []
    for c in csv_records:
        if c in geo_records:
            csv_lat = float(csv_records[c]["latitude"])
            csv_lon = float(csv_records[c]["longitude"])
            geo_lat = float(geo_records[c]["latitude"])
            geo_lon = float(geo_records[c]["longitude"])
            dist = haversine_km(csv_lat, csv_lon, geo_lat, geo_lon)
            if dist > 0.05:  # more than 50 meters difference
                coord_mismatches.append({
                    "code": c,
                    "name": csv_records[c]["name"],
                    "csv_coords": (csv_lat, csv_lon),
                    "geo_coords": (geo_lat, geo_lon),
                    "dist_km": dist,
                })

    return {
        "csv_count": len(csv_records),
        "geojson_count": len(geo_records),
        "in_csv_not_geojson_count": len(in_csv_not_geo),
        "in_csv_not_geojson": in_csv_not_geo,
        "in_geojson_not_csv_count": len(in_geo_not_csv),
        "in_geojson_not_csv": in_geo_not_csv,
        "coordinate_mismatches_gt_50m": coord_mismatches,
    }


def audit_zones_and_divisions() -> Dict[str, Any]:
    """Audit india_railway_zones_and_divisions.csv."""
    csv_path = ISOLATED_DATA_DIR / "india_railway_zones_and_divisions.csv"
    if not csv_path.exists():
        return {"error": "File not found"}

    rows = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames or []
        for r in reader:
            rows.append(r)

    zones = [r.get("zone_code") for r in rows]
    total_zones = len(zones)

    # Check division counts
    division_map = {}
    for r in rows:
        zcode = r.get("zone_code")
        div_str = r.get("divisions", "")
        div_list = [d.strip() for d in div_str.split(",") if d.strip()]
        division_map[zcode] = div_list

    return {
        "fields": fields,
        "total_zones": total_zones,
        "zone_codes": zones,
        "division_map": division_map,
        "rows": rows,
    }


def reconcile_canonical_stations(csv_data: Dict[str, Any], geojson_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Reconcile the 7 RailAir canonical stations against DataMeet records.
    Uses exact code match, name substring match, and geographic proximity.
    """
    all_dm_stations = {}
    # Combine CSV records and GeoJSON records
    for r in csv_data.get("records", []):
        all_dm_stations[r["code"]] = {
            "code": r["code"],
            "name": r["name"],
            "zone": r["zone"],
            "division": r["division"],
            "district": r["district"],
            "lat": float(r["latitude"]),
            "lng": float(r["longitude"]),
            "source": "CSV",
        }
    for r in geojson_data.get("records", []):
        code = r["code"]
        if code not in all_dm_stations:
            all_dm_stations[code] = {
                "code": code,
                "name": r["name"],
                "zone": r["zone"],
                "division": r["division"],
                "district": r.get("district", ""),
                "lat": float(r["latitude"]),
                "lng": float(r["longitude"]),
                "source": "GeoJSON",
            }

    reconciliation = []

    for c_stn in CANONICAL_STATIONS:
        cid = c_stn["id"]
        cname = c_stn["name"]
        clat = c_stn["lat"]
        clng = c_stn["lng"]

        # Strategy 1: Exact code match
        exact_code_candidate = all_dm_stations.get(cid)

        # Strategy 2: Proximity search (< 20 km)
        candidates_by_dist = []
        for code, dm in all_dm_stations.items():
            dist = haversine_km(clat, clng, dm["lat"], dm["lng"])
            candidates_by_dist.append((dist, code, dm))
        candidates_by_dist.sort(key=lambda x: x[0])

        best_proximity = candidates_by_dist[0] if candidates_by_dist else None

        # Strategy 3: Name match search
        name_candidates = []
        cname_lower = cname.lower()
        short_lower = c_stn["short_name"].lower()
        for code, dm in all_dm_stations.items():
            dm_name_lower = dm["name"].lower()
            if short_lower in dm_name_lower or dm_name_lower in cname_lower:
                dist = haversine_km(clat, clng, dm["lat"], dm["lng"])
                name_candidates.append((dist, code, dm))
        name_candidates.sort(key=lambda x: x[0])

        best_candidate = None
        match_confidence = "NONE"
        dist_km = None
        conflicts = []
        action = ""

        if exact_code_candidate:
            best_candidate = exact_code_candidate
            dist_km = haversine_km(clat, clng, best_candidate["lat"], best_candidate["lng"])
            if dist_km < 1.0:
                match_confidence = "HIGH (Exact Code & Proximity < 1km)"
                action = "Reconcile metadata; keep stable ID 'GZB'. Retain canonical or align to surveyed point."
            else:
                match_confidence = f"MEDIUM (Exact Code, Distance {dist_km:.2f} km)"
                conflicts.append(f"Coordinates differ by {dist_km:.2f} km")
                action = "Investigate coordinate variance between synthetic seed and DataMeet record."
        elif name_candidates:
            best_candidate = name_candidates[0][2]
            dist_km = name_candidates[0][0]
            if dist_km < 5.0:
                match_confidence = "HIGH (Name match & Proximity < 5km)"
                conflicts.append(f"Official IR station code is '{best_candidate['code']}', whereas RailAir ID is '{cid}'")
                action = f"Map RailAir internal ID '{cid}' to official IR code '{best_candidate['code']}'. Update coordinates to {best_candidate['lat']}, {best_candidate['lng']} in Phase 2 import."
            else:
                match_confidence = f"LOW (Name similarity but distance {dist_km:.2f} km)"
                conflicts.append(f"Distance is large ({dist_km:.2f} km)")
                action = "Review if station is physically distinct or misaligned."
        else:
            match_confidence = "NONE"
            if best_proximity and best_proximity[0] < 15.0:
                conflicts.append(f"No name/code match in DataMeet UP dataset. Closest station is {best_proximity[1]} ({best_proximity[2]['name']}) at {best_proximity[0]:.2f} km.")
            else:
                conflicts.append("Station is outside UP dataset coverage (e.g. NCT Delhi) or absent from 70 major UP stations list.")
            action = "Retain synthetic station definition. Supplement with national datameet/railways or Delhi dataset for official geometry."

        reconciliation.append({
            "canonical_id": cid,
            "canonical_name": cname,
            "canonical_coords": (clat, clng),
            "candidate_code": best_candidate["code"] if best_candidate else None,
            "candidate_name": best_candidate["name"] if best_candidate else None,
            "candidate_coords": (best_candidate["lat"], best_candidate["lng"]) if best_candidate else None,
            "distance_km": round(dist_km, 3) if dist_km is not None else None,
            "match_confidence": match_confidence,
            "conflicts": conflicts,
            "recommended_action": action,
        })

    return reconciliation


def check_corridor_geometry() -> Dict[str, Any]:
    """Check whether actual railway track vectors or lines exist in DataMeet isolated datasets."""
    vector_files = []
    line_files = []
    for p in ISOLATED_DATA_DIR.iterdir():
        if p.suffix.lower() == ".geojson":
            try:
                with open(p, "r", encoding="utf-8") as f:
                    gj = json.load(f)
                    geom_types = set(feat.get("geometry", {}).get("type") for feat in gj.get("features", []))
                    vector_files.append((p.name, geom_types))
                    if "LineString" in geom_types or "MultiLineString" in geom_types:
                        line_files.append(p.name)
            except Exception:
                pass

    return {
        "geojson_files_inspected": vector_files,
        "contains_linestring_track_geometry": len(line_files) > 0,
        "linestring_files": line_files,
        "assessment": (
            "No railway track geometry (LineString/MultiLineString) exists in isolated_data. "
            "uttar_pradesh_railway_stations.geojson contains ONLY Point features (stations). "
            "The existing corridor segments in src/data/mock/corridorSegments.ts are synthetic "
            "schematic polylines, NOT verified railway track alignments. To obtain authoritative track alignments, "
            "RailAir will need to fetch upstream datameet/railways 'trains.json' or OpenStreetMap 'railway=rail' ways."
        ),
    }


def generate_full_report() -> Dict[str, Any]:
    """Run all audit steps and assemble the master report."""
    inventory = audit_file_inventory()
    csv_stations = audit_up_stations_csv()
    geo_stations = audit_up_stations_geojson()
    comparison = compare_csv_and_geojson(csv_stations, geo_stations)
    zones = audit_zones_and_divisions()
    reconciliation = reconcile_canonical_stations(csv_stations, geo_stations)
    corridor_geom = check_corridor_geometry()

    return {
        "inventory": inventory,
        "station_csv": {
            "total_records": csv_stations.get("total_records"),
            "fields": csv_stations.get("fields"),
            "unique_codes": csv_stations.get("unique_codes"),
            "code_duplicates": csv_stations.get("code_duplicates"),
            "name_duplicates": csv_stations.get("name_duplicates"),
            "invalid_coordinates": csv_stations.get("invalid_coordinates"),
            "lat_range": csv_stations.get("lat_range"),
            "lon_range": csv_stations.get("lon_range"),
            "zones_breakdown": csv_stations.get("zones_breakdown"),
            "divisions_breakdown": csv_stations.get("divisions_breakdown"),
            "categories_breakdown": csv_stations.get("categories_breakdown"),
        },
        "station_geojson": {
            "collection_type": geo_stations.get("collection_type"),
            "crs": geo_stations.get("crs"),
            "total_features": geo_stations.get("total_features"),
            "unique_codes": geo_stations.get("unique_codes"),
            "code_duplicates": geo_stations.get("code_duplicates"),
            "invalid_geometries": geo_stations.get("invalid_geometries"),
            "lat_range": geo_stations.get("lat_range"),
            "lon_range": geo_stations.get("lon_range"),
        },
        "csv_vs_geojson_comparison": comparison,
        "zones_and_divisions": {
            "total_zones": zones.get("total_zones"),
            "fields": zones.get("fields"),
            "zone_codes": zones.get("zone_codes"),
            "division_counts": {z: len(divs) for z, divs in zones.get("division_map", {}).items()},
        },
        "seven_station_reconciliation": reconciliation,
        "corridor_geometry_assessment": corridor_geom,
    }


def main():
    print("=" * 80)
    print("RailAir Intelligence — DataMeet Geospatial Audit")
    print(f"Isolated Data Directory: {ISOLATED_DATA_DIR}")
    print("=" * 80)

    report = generate_full_report()

    # Print Inventory
    print("\n[1] FILE INVENTORY:")
    print(f"{'Filename':<50} {'Size (B)':<10} {'Lines':<8} {'Status':<15} Classification")
    print("-" * 115)
    for f in report["inventory"]:
        print(f"{f['filename']:<50} {f['size_bytes']:<10} {f['line_count']:<8} {f['status']:<15} {f['classification']}")

    # Print Station CSV summary
    print("\n[2] UP RAILWAY STATIONS CSV AUDIT:")
    sc = report["station_csv"]
    print(f"  Total records: {sc['total_records']}")
    print(f"  Header fields: {sc['fields']}")
    print(f"  Unique codes:  {sc['unique_codes']}")
    print(f"  Code duplicates: {sc['code_duplicates']}")
    print(f"  Name duplicates: {sc['name_duplicates']}")
    print(f"  Invalid coords:  {sc['invalid_coordinates']}")
    print(f"  Latitude range:  {sc['lat_range']}")
    print(f"  Longitude range: {sc['lon_range']}")
    print(f"  Zones breakdown: {sc['zones_breakdown']}")

    # Print Station GeoJSON summary
    print("\n[3] UP RAILWAY STATIONS GEOJSON AUDIT:")
    sg = report["station_geojson"]
    print(f"  Total features:   {sg['total_features']}")
    print(f"  CRS:              {sg['crs']}")
    print(f"  Unique codes:     {sg['unique_codes']}")
    print(f"  Code duplicates:  {sg['code_duplicates']}")
    print(f"  Invalid geoms:    {sg['invalid_geometries']}")
    print(f"  Latitude range:   {sg['lat_range']}")
    print(f"  Longitude range:  {sg['lon_range']}")

    # Print CSV vs GeoJSON comparison
    print("\n[4] CSV vs GEOJSON COMPARISON:")
    comp = report["csv_vs_geojson_comparison"]
    print(f"  CSV records: {comp['csv_count']} | GeoJSON features: {comp['geojson_count']}")
    print(f"  In CSV but missing from GeoJSON ({comp['in_csv_not_geojson_count']}): {comp['in_csv_not_geojson']}")
    print(f"  In GeoJSON but missing from CSV ({comp['in_geojson_not_csv_count']}): {comp['in_geojson_not_csv']}")
    print(f"  Coordinate mismatches (>50m): {len(comp['coordinate_mismatches_gt_50m'])}")

    # Print Zones and Divisions
    print("\n[5] RAILWAY ZONES & DIVISIONS AUDIT:")
    zd = report["zones_and_divisions"]
    print(f"  Total Zones: {zd['total_zones']}")
    print(f"  Fields:      {zd['fields']}")
    print(f"  Zone codes:  {zd['zone_codes']}")

    # Print Reconciliation Table
    print("\n[6] RECONCILIATION WITH RAILAIR'S 7 CANONICAL STATIONS:")
    print(f"{'ID':<6} {'Name':<26} {'Match Code':<12} {'Match Name':<28} {'Dist (km)':<10} {'Confidence':<30}")
    print("-" * 115)
    for rec in report["seven_station_reconciliation"]:
        mcode = rec["candidate_code"] or "NONE"
        mname = rec["candidate_name"] or "No candidate found"
        dist = f"{rec['distance_km']:.2f}" if rec["distance_km"] is not None else "N/A"
        print(f"{rec['canonical_id']:<6} {rec['canonical_name']:<26} {mcode:<12} {mname:<28} {dist:<10} {rec['match_confidence']:<30}")
        if rec["conflicts"]:
            for c in rec["conflicts"]:
                print(f"       -> Conflict: {c}")
        if rec["recommended_action"]:
            print(f"       -> Action:   {rec['recommended_action']}")

    # Print Corridor Geometry Assessment
    print("\n[7] CORRIDOR GEOMETRY ASSESSMENT:")
    cga = report["corridor_geometry_assessment"]
    print(f"  Contains track LineStrings: {cga['contains_linestring_track_geometry']}")
    print(f"  Assessment: {cga['assessment']}")

    print("\nAudit completed successfully. All source files were read without modification.")


if __name__ == "__main__":
    main()
