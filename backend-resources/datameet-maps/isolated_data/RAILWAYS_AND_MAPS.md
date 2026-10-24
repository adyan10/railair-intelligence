# Railways and Maps: India & Uttar Pradesh GIS Geospatial Analysis

This guide integrates open administrative map layers from [`datameet/maps`](https://github.com/datameet/maps) with the Indian Railways network layers from [`datameet/railways`](https://github.com/datameet/railways).

---

## 1. Network Overview: India vs. Uttar Pradesh

| Metric | Indian Railways (National) | Uttar Pradesh Railway Network | Share / Rank |
| :--- | :--- | :--- | :--- |
| **Total Route Length** | ~68,043 km | **~9,164 km** | **Rank 1 in India** (~13.5% of national network) |
| **Railway Zones** | 18 Zones | 2 Zonal Headquarters (NCR & NER) + NR, ECR, WCR operations | Primary railway transit state |
| **Divisional HQs** | 70 Divisions | 7 Divisions (Prayagraj, Agra, Jhansi, Lucknow NER, Izzatnagar, Varanasi, Lucknow NR, Moradabad) | 10% of national divisions |
| **Major Railway Stations** | ~7,325 stations nationwide | **~1,150+ operational railway stations** | Highest station count in India |
| **Electrification** | >94% electrified | >98% broad-gauge electrified | Near 100% electrified broad-gauge network |
| **Dedicated Freight Corridors (DFC)** | EDFC (~1,337 km) + WDFC (~1,506 km) | Crosses entire length of UP; meeting junction at **Dadri (Greater Noida)** | Vital industrial & logistics spine |

---

## 2. Indian Railways Zonal Organization (National Table)

*Extracted and isolated in [india_railway_zones_and_divisions.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/india_railway_zones_and_divisions.csv)*:

| Zone Code | Zone Name | Headquarters | Key Divisions | States Covered |
| :--- | :--- | :--- | :--- | :--- |
| **NCR** | **North Central Railway** | **Prayagraj (UP)** | **Prayagraj, Agra, Jhansi** | **Uttar Pradesh**, MP, Rajasthan, Haryana |
| **NER** | **North Eastern Railway** | **Gorakhpur (UP)** | **Lucknow, Izzatnagar, Varanasi** | **Uttar Pradesh**, Bihar, Uttarakhand |
| **NR** | Northern Railway | New Delhi | Delhi, Ambala, Firozpur, **Lucknow, Moradabad** | Delhi, Haryana, Punjab, **UP**, HP, J&K, Uttarakhand |
| **ECR** | East Central Railway | Hajipur | Danapur, Dhanbad, **Pt. Deen Dayal Upadhyaya**, Samastipur, Sonpur | Bihar, Jharkhand, **UP**, MP |
| **CR** | Central Railway | Mumbai (CSMT) | Mumbai, Bhusawal, Pune, Solapur, Nagpur | Maharashtra, MP, Karnataka |
| **WR** | Western Railway | Mumbai (Churchgate) | Mumbai Central, Vadodara, Ratlam, Ahmedabad, Rajkot, Bhavnagar | Maharashtra, Gujarat, Rajasthan, MP |
| **WCR** | West Central Railway | Jabalpur | Jabalpur, Bhopal, Kota | MP, Rajasthan, **UP** |
| **ER** | Eastern Railway | Kolkata | Howrah, Sealdah, Asansol, Malda | West Bengal, Bihar, Jharkhand |
| **SER** | South Eastern Railway | Kolkata (Garden Reach) | Kharagpur, Adra, Chakradharpur, Ranchi | West Bengal, Jharkhand, Odisha |
| **ECoR** | East Coast Railway | Bhubaneswar | Khurda Road, Sambalpur, Waltair | Odisha, Andhra Pradesh, Chhattisgarh |
| **SECR** | South East Central Railway | Bilaspur | Bilaspur, Raipur, Nagpur | Chhattisgarh, MP, Maharashtra, Odisha |
| **SCR** | South Central Railway | Secunderabad | Secunderabad, Hyderabad, Vijayawada, Guntakal, Guntur, Nanded | Telangana, Andhra Pradesh, Maharashtra, Karnataka |
| **SR** | Southern Railway | Chennai Central | Chennai, Tiruchirappalli, Madurai, Palakkad, Salem, Thiruvananthapuram | Tamil Nadu, Kerala, Puducherry, Andhra Pradesh |
| **SWR** | South Western Railway | Hubballi | Hubballi, Bengaluru, Mysuru | Karnataka, Goa, Maharashtra, Tamil Nadu |
| **NWR** | North Western Railway | Jaipur | Jaipur, Ajmer, Bikaner, Jodhpur | Rajasthan, Gujarat, Punjab, Haryana |
| **NFR** | Northeast Frontier Railway | Guwahati (Maligaon) | Alipurduar, Katihar, Lumding, Rangiya, Tinsukia | Assam, West Bengal, Bihar, NE States |
| **SCoR** | South Coast Railway | Visakhapatnam | Vijayawada, Guntur, Guntakal | Andhra Pradesh, Telangana |
| **MR** | Metro Railway | Kolkata | Kolkata Metro Lines | West Bengal |

---

## 3. Uttar Pradesh Railway Hubs & Key Junctions

Uttar Pradesh sits at the geographic center of India's east-west and north-south railway trunk lines:

1. **Pt. Deen Dayal Upadhyaya Junction (DDU - Chandauli)**:
   - Formerly Mughalsarai Junction.
   - Houses the largest railway marshalling yard in Asia (12.5 km long, handling ~1,500+ wagons daily).
   - Key junction connecting the Grand Chord line (Delhi to Howrah via Gaya/Dhanbad).
2. **Kanpur Central (CNB - Kanpur Nagar)**:
   - One of the five major "Central" railway stations in India.
   - Serves 10 platforms and 300+ trains daily on the high-speed Delhi-Howrah route.
3. **Lucknow Charbagh (LKO / LJN)**:
   - Iconic architectural terminal designed as a Rajput/Mughal palace.
   - Dual station complex: LKO (Northern Railway) and LJN (North Eastern Railway).
4. **Prayagraj Junction (PRYJ - Prayagraj)**:
   - Headquarters of North Central Railway.
   - Critical transit node for Kumbh Mela passenger traffic and confluence of 7 rail lines.
5. **Gorakhpur Junction (GKP - Gorakhpur)**:
   - Headquarters of North Eastern Railway.
   - World's second longest railway platform (1,366.33 m / 4,482.7 ft).
6. **Varanasi Junction (BSB) & Banaras (BSBS)**:
   - Spiritual gateway on the Ganga river; adjacent to Banaras Locomotive Works (BLW), India's premier electric locomotive manufacturer.
7. **Virangana Lakshmibai Jhansi (VGLJ - Jhansi)**:
   - Bundelkhand gateway connecting New Delhi to Mumbai, Bengaluru, Hyderabad, and Chennai.
8. **Mathura Junction (MTJ - Mathura)**:
   - 7-route junction connecting Delhi, Mumbai, Agra, Kasganj, Alwar, and Achhnera.

*Full Station Catalog*: [uttar_pradesh_railway_stations.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_railway_stations.csv)  
*Spatial GeoJSON Layer*: [uttar_pradesh_railway_stations.geojson](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_railway_stations.geojson)

---

## 4. How to Layer Railways with Administrative Maps

To create rich maps combining boundaries and railway networks:

### Layering Stack:
```
Top Layer:       [Point]       Railway Stations (isolated_data/uttar_pradesh_railway_stations.geojson)
Middle Layer 1:  [LineString]  Railway Tracks / Train Routes (from datameet/railways trains.json)
Middle Layer 2:  [Polygon]     Census 2011 Districts (website/docs/data/geojson/dists11.geojson)
Bottom Layer:    [Polygon]     State Boundary (website/docs/data/geojson/states.geojson - Line 37)
```

### Loading in QGIS or Mapshaper:
1. Open [Mapshaper.org](https://mapshaper.org/) or QGIS.
2. Drag and drop the administrative boundary:
   - India: [india-composite.geojson](file:///c:/Users/Astha/github/test1/maps/Country/india-composite.geojson) or [india-land-simplified.geojson](file:///c:/Users/Astha/github/test1/maps/Country/india-land-simplified.geojson)
   - Uttar Pradesh: [states.geojson](file:///c:/Users/Astha/github/test1/maps/website/docs/data/geojson/states.geojson) (filtered by `ST_NM == 'Uttar Pradesh'`)
3. Overlay [uttar_pradesh_railway_stations.geojson](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_railway_stations.geojson) as vector points.
4. Style station points with custom colors based on railway zone (`NCR`: Blue, `NER`: Green, `NR`: Red, `ECR`: Orange).

---

## 5. Direct Files Available in Workspace

- [uttar_pradesh_railway_stations.geojson](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_railway_stations.geojson) (GeoJSON point feature layer for UP stations)
- [uttar_pradesh_railway_stations.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_railway_stations.csv) (Tabular catalog of major UP stations)
- [india_railway_zones_and_divisions.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/india_railway_zones_and_divisions.csv) (All 18 national zones, headquarters, route lengths, divisions)
- [india_railways_profile.json](file:///c:/Users/Astha/github/test1/maps/isolated_data/india_railways_profile.json) (National railway profile)
- [uttar_pradesh_railways_profile.json](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_railways_profile.json) (State railway profile)
