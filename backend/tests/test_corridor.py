from fastapi.testclient import TestClient


def test_get_corridor_endpoint(client: TestClient) -> None:
    response = client.get("/api/v1/corridor")
    assert response.status_code == 200
    corridor = response.json()

    assert corridor["id"] == "CORR-MRT-DEL"
    assert corridor["name"] == "Meerut—Ghaziabad—Delhi Main Line"
    assert corridor["focus"] == "Meerut—Ghaziabad—Delhi"
    assert corridor["totalDistanceKm"] == 71.8
    assert corridor["totalNodes"] == 7

    expected_stations = ["MRT", "MMU", "MNR", "GZB", "SAH", "DSO", "NDLS"]
    assert corridor["stations"] == expected_stations

    # 6 contiguous segments connecting 7 stations
    segments = corridor["segments"]
    assert len(segments) == 6

    # Verify sequential segment connectivity
    for i in range(len(segments)):
        seg = segments[i]
        assert seg["fromStationId"] == expected_stations[i]
        assert seg["toStationId"] == expected_stations[i + 1]
        assert seg["distanceKm"] > 0
        assert seg["travelTimeMinutes"] > 0
        assert len(seg["path"]) >= 2
        assert seg["pm25Estimate"] > 0
        assert seg["pm10Estimate"] > 0
        assert seg["provenance"]["dataKind"] == "simulated"

    # Verify total segment distance matches route total
    total_seg_dist = sum(s["distanceKm"] for s in segments)
    assert total_seg_dist == 83.0  # Sum of individual segment distances
