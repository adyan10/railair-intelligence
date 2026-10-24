"""Station and Corridor business domain service.

Coordinates retrieval of railway station nodes and corridor alignments.
Provides deterministic data access with clean abstraction for future live
CPCB ingestion and PostGIS spatial queries.
"""
from typing import List, Optional
from ..models.schemas import Station, Corridor, StationType, PollutantType
from ..db.seed_data import get_seed_stations, get_seed_corridor


class StationService:
    def __init__(self) -> None:
        # Load baseline seed data into memory
        self._stations: List[Station] = get_seed_stations()
        self._corridor: Corridor = get_seed_corridor()

    def get_all_stations(
        self,
        station_type: Optional[StationType] = None,
        pollutant: Optional[PollutantType] = None,
    ) -> List[Station]:
        """Returns all corridor station nodes, optionally filtered by type or pollutant."""
        results = self._stations

        if station_type is not None:
            results = [s for s in results if s.station_type == station_type]

        if pollutant is not None:
            results = [
                s
                for s in results
                if any(obs.pollutant == pollutant for obs in s.observations)
            ]

        return results

    def get_station_by_id(self, station_id: str) -> Optional[Station]:
        """Look up station by unique alphanumeric code (case-insensitive)."""
        normalized_id = station_id.strip().upper()
        for station in self._stations:
            if station.id.upper() == normalized_id:
                return station
        return None

    def get_corridor(self) -> Corridor:
        """Returns the primary monitored railway corridor geometry and alignment nodes."""
        return self._corridor


# Singleton service instance
station_service = StationService()
