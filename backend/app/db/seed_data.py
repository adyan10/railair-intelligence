"""Deterministic canonical baseline data for RailAir Intelligence.

Mirrors the simulated frontend datasets in src/data/mock/stations.ts and
src/data/mock/corridorSegments.ts with explicit simulation provenance.
"""
from typing import Dict, List
from ..models.schemas import Station, CorridorSegment, Corridor, DataProvenance

DEFAULT_SIM_PROVENANCE = DataProvenance(
    source="RailAir Intelligence Simulation Engine v0.1",
    timestamp="2024-10-24T07:00:00Z",
    dataKind="simulated",
    confidence="low",
    confidenceScore=0.25,
    notes="All values are illustrative simulations. No real monitoring instruments were used.",
)

CANONICAL_STATIONS_DATA: List[Dict] = [
    {
        "id": "MRT",
        "name": "Meerut City Junction",
        "shortName": "Meerut",
        "position": {"lat": 28.9845, "lng": 77.7064},
        "type": "major",
        "distanceFromOriginKm": 0.0,
        "platforms": "5 Platforms",
        "sub": "Delhi Division · Northern Railway",
        "provenance": DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
        "observations": [
            {
                "id": "obs-MRT-pm25",
                "stationId": "MRT",
                "pollutant": "PM2.5",
                "value": 112.0,
                "unit": "µg/m³",
                "who_guideline": 15.0,
                "naaqs_standard": 60.0,
                "provenance": DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
            },
            {
                "id": "obs-MRT-pm10",
                "stationId": "MRT",
                "pollutant": "PM10",
                "value": 198.0,
                "unit": "µg/m³",
                "who_guideline": 45.0,
                "naaqs_standard": 100.0,
                "provenance": DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
            },
        ],
    },
    {
        "id": "MMU",
        "name": "Modinagar",
        "shortName": "Modinagar",
        "position": {"lat": 28.8324, "lng": 77.5803},
        "type": "halt",
        "distanceFromOriginKm": 22.0,
        "platforms": "2 Platforms",
        "sub": "Delhi Division · Northern Railway",
        "provenance": {
            **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
            "confidenceScore": 0.15,
        },
        "observations": [
            {
                "id": "obs-MMU-pm25",
                "stationId": "MMU",
                "pollutant": "PM2.5",
                "value": 98.0,
                "unit": "µg/m³",
                "who_guideline": 15.0,
                "naaqs_standard": 60.0,
                "provenance": {
                    **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
                    "confidenceScore": 0.15,
                },
            },
            {
                "id": "obs-MMU-pm10",
                "stationId": "MMU",
                "pollutant": "PM10",
                "value": 172.0,
                "unit": "µg/m³",
                "who_guideline": 45.0,
                "naaqs_standard": 100.0,
                "provenance": {
                    **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
                    "confidenceScore": 0.15,
                },
            },
        ],
    },
    {
        "id": "MNR",
        "name": "Muradnagar",
        "shortName": "Muradnagar",
        "position": {"lat": 28.7762, "lng": 77.5096},
        "type": "halt",
        "distanceFromOriginKm": 38.0,
        "platforms": "2 Platforms",
        "sub": "Delhi Division · Northern Railway",
        "provenance": {
            **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
            "confidenceScore": 0.12,
        },
        "observations": [
            {
                "id": "obs-MNR-pm25",
                "stationId": "MNR",
                "pollutant": "PM2.5",
                "value": 128.0,
                "unit": "µg/m³",
                "who_guideline": 15.0,
                "naaqs_standard": 60.0,
                "provenance": {
                    **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
                    "confidenceScore": 0.12,
                },
            },
            {
                "id": "obs-MNR-pm10",
                "stationId": "MNR",
                "pollutant": "PM10",
                "value": 221.0,
                "unit": "µg/m³",
                "who_guideline": 45.0,
                "naaqs_standard": 100.0,
                "provenance": {
                    **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
                    "confidenceScore": 0.12,
                },
            },
        ],
    },
    {
        "id": "GZB",
        "name": "Ghaziabad Junction",
        "shortName": "Ghaziabad",
        "position": {"lat": 28.6595, "lng": 77.4246},
        "type": "junction",
        "distanceFromOriginKm": 56.0,
        "platforms": "6 Platforms",
        "sub": "Major Intercity Junction · Northern Railway",
        "provenance": {
            **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
            "confidenceScore": 0.30,
        },
        "observations": [
            {
                "id": "obs-GZB-pm25",
                "stationId": "GZB",
                "pollutant": "PM2.5",
                "value": 145.0,
                "unit": "µg/m³",
                "who_guideline": 15.0,
                "naaqs_standard": 60.0,
                "provenance": {
                    **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
                    "confidenceScore": 0.30,
                },
            },
            {
                "id": "obs-GZB-pm10",
                "stationId": "GZB",
                "pollutant": "PM10",
                "value": 248.0,
                "unit": "µg/m³",
                "who_guideline": 45.0,
                "naaqs_standard": 100.0,
                "provenance": {
                    **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
                    "confidenceScore": 0.30,
                },
            },
        ],
    },
    {
        "id": "SAH",
        "name": "Sahibabad Junction",
        "shortName": "Sahibabad",
        "position": {"lat": 28.6838, "lng": 77.3613},
        "type": "junction",
        "distanceFromOriginKm": 65.0,
        "platforms": "4 Platforms",
        "sub": "Delhi Division · Northern Railway",
        "provenance": {
            **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
            "confidenceScore": 0.18,
        },
        "observations": [
            {
                "id": "obs-SAH-pm25",
                "stationId": "SAH",
                "pollutant": "PM2.5",
                "value": 138.0,
                "unit": "µg/m³",
                "who_guideline": 15.0,
                "naaqs_standard": 60.0,
                "provenance": {
                    **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
                    "confidenceScore": 0.18,
                },
            },
            {
                "id": "obs-SAH-pm10",
                "stationId": "SAH",
                "pollutant": "PM10",
                "value": 235.0,
                "unit": "µg/m³",
                "who_guideline": 45.0,
                "naaqs_standard": 100.0,
                "provenance": {
                    **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
                    "confidenceScore": 0.18,
                },
            },
        ],
    },
    {
        "id": "DSO",
        "name": "Delhi Shahdara Junction",
        "shortName": "Shahdara",
        "position": {"lat": 28.6730, "lng": 77.2979},
        "type": "halt",
        "distanceFromOriginKm": 72.0,
        "platforms": "4 Platforms",
        "sub": "Delhi Division · Northern Railway",
        "provenance": {
            **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
            "confidenceScore": 0.20,
        },
        "observations": [
            {
                "id": "obs-DSO-pm25",
                "stationId": "DSO",
                "pollutant": "PM2.5",
                "value": 156.0,
                "unit": "µg/m³",
                "who_guideline": 15.0,
                "naaqs_standard": 60.0,
                "provenance": {
                    **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
                    "confidenceScore": 0.20,
                },
            },
            {
                "id": "obs-DSO-pm10",
                "stationId": "DSO",
                "pollutant": "PM10",
                "value": 267.0,
                "unit": "µg/m³",
                "who_guideline": 45.0,
                "naaqs_standard": 100.0,
                "provenance": {
                    **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
                    "confidenceScore": 0.20,
                },
            },
        ],
    },
    {
        "id": "NDLS",
        "name": "New Delhi Railway Station",
        "shortName": "New Delhi",
        "position": {"lat": 28.6419, "lng": 77.2194},
        "type": "terminal",
        "distanceFromOriginKm": 83.0,
        "platforms": "16 Platforms",
        "sub": "Central Mega Terminal · Northern Railway",
        "provenance": {
            **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
            "confidenceScore": 0.35,
        },
        "observations": [
            {
                "id": "obs-NDLS-pm25",
                "stationId": "NDLS",
                "pollutant": "PM2.5",
                "value": 168.0,
                "unit": "µg/m³",
                "who_guideline": 15.0,
                "naaqs_standard": 60.0,
                "provenance": {
                    **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
                    "confidenceScore": 0.35,
                },
            },
            {
                "id": "obs-NDLS-pm10",
                "stationId": "NDLS",
                "pollutant": "PM10",
                "value": 289.0,
                "unit": "µg/m³",
                "who_guideline": 45.0,
                "naaqs_standard": 100.0,
                "provenance": {
                    **DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
                    "confidenceScore": 0.35,
                },
            },
        ],
    },
]

CORRIDOR_SEGMENTS_DATA: List[Dict] = [
    {
        "id": "seg-MRT-MMU",
        "fromStationId": "MRT",
        "toStationId": "MMU",
        "distanceKm": 22.0,
        "travelTimeMinutes": 28,
        "path": [
            {"lat": 28.9845, "lng": 77.7064},
            {"lat": 28.9100, "lng": 77.6600},
            {"lat": 28.8324, "lng": 77.5803},
        ],
        "pm25Estimate": 105.0,
        "pm10Estimate": 185.0,
        "provenance": DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
    },
    {
        "id": "seg-MMU-MNR",
        "fromStationId": "MMU",
        "toStationId": "MNR",
        "distanceKm": 16.0,
        "travelTimeMinutes": 20,
        "path": [
            {"lat": 28.8324, "lng": 77.5803},
            {"lat": 28.8050, "lng": 77.5450},
            {"lat": 28.7762, "lng": 77.5096},
        ],
        "pm25Estimate": 113.0,
        "pm10Estimate": 197.0,
        "provenance": DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
    },
    {
        "id": "seg-MNR-GZB",
        "fromStationId": "MNR",
        "toStationId": "GZB",
        "distanceKm": 18.0,
        "travelTimeMinutes": 22,
        "path": [
            {"lat": 28.7762, "lng": 77.5096},
            {"lat": 28.7200, "lng": 77.4700},
            {"lat": 28.6595, "lng": 77.4246},
        ],
        "pm25Estimate": 136.0,
        "pm10Estimate": 234.0,
        "provenance": DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
    },
    {
        "id": "seg-GZB-SAH",
        "fromStationId": "GZB",
        "toStationId": "SAH",
        "distanceKm": 9.0,
        "travelTimeMinutes": 12,
        "path": [
            {"lat": 28.6595, "lng": 77.4246},
            {"lat": 28.6720, "lng": 77.3930},
            {"lat": 28.6838, "lng": 77.3613},
        ],
        "pm25Estimate": 141.0,
        "pm10Estimate": 241.0,
        "provenance": DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
    },
    {
        "id": "seg-SAH-DSO",
        "fromStationId": "SAH",
        "toStationId": "DSO",
        "distanceKm": 7.0,
        "travelTimeMinutes": 10,
        "path": [
            {"lat": 28.6838, "lng": 77.3613},
            {"lat": 28.6784, "lng": 77.3296},
            {"lat": 28.6730, "lng": 77.2979},
        ],
        "pm25Estimate": 147.0,
        "pm10Estimate": 251.0,
        "provenance": DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
    },
    {
        "id": "seg-DSO-NDLS",
        "fromStationId": "DSO",
        "toStationId": "NDLS",
        "distanceKm": 11.0,
        "travelTimeMinutes": 16,
        "path": [
            {"lat": 28.6730, "lng": 77.2979},
            {"lat": 28.6575, "lng": 77.2587},
            {"lat": 28.6419, "lng": 77.2194},
        ],
        "pm25Estimate": 162.0,
        "pm10Estimate": 278.0,
        "provenance": DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
    },
]

CORRIDOR_DATA: Dict = {
    "id": "CORR-MRT-DEL",
    "name": "Meerut—Ghaziabad—Delhi Main Line",
    "focus": "Meerut—Ghaziabad—Delhi",
    "totalDistanceKm": 71.8,
    "totalNodes": 7,
    "stations": ["MRT", "MMU", "MNR", "GZB", "SAH", "DSO", "NDLS"],
    "segments": CORRIDOR_SEGMENTS_DATA,
    "provenance": DEFAULT_SIM_PROVENANCE.model_dump(by_alias=True),
}


def get_seed_stations() -> List[Station]:
    return [Station.model_validate(s) for s in CANONICAL_STATIONS_DATA]


def get_seed_corridor() -> Corridor:
    return Corridor.model_validate(CORRIDOR_DATA)
