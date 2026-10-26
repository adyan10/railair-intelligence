# National Dataset & Infrastructure Profile: India

This document provides a comprehensive, isolated dataset and analytical profile for **India** at the national tier, combining administrative boundaries, demographics, electoral representation, geospatial layers, and railway infrastructure.

---

## 1. Overview & Geography
- **Entity**: Republic of India (National Level)
- **ISO Code**: IND
- **Administrative Divisions**: 36 States and Union Territories (28 States, 8 UTs)
- **Census Districts (2011)**: 640 Districts
- **Geographic Extent**:
  - Northernmost Point: ~37.087° N (Indira Col, Ladakh)
  - Southernmost Point: ~8.068° N (Kanyakumari / Great Nicobar at 6.75° N)
  - Westernmost Point: ~68.199° E (Ghuar Mota, Gujarat)
  - Easternmost Point: ~97.407° E (Kibithu, Arunachal Pradesh)

---

## 2. Demographic Profile (Census 2001 & 2011)

Extracted from [statesCensus.csv](file:///c:/Users/Astha/github/test1/maps/website/docs/data/csv/statesCensus.csv):

| Metric | Census 2001 | Census 2011 | Net Change |
| :--- | :--- | :--- | :--- |
| **National Sex Ratio** (females per 1,000 males) | **933** | **940** | **+7** |
| **National Average Density** | 325 persons/km² | 382 persons/km² | +57 persons/km² |
| **Total Districts Tracked** | 593 | 640 | +47 districts |

*Dedicated Tabular File*: [india_census.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/india_census.csv)

---

## 3. Electoral Structure

### Parliamentary Constituencies (Lok Sabha)
- **Total Seats**: 543
- **Data Source**: [pc_14.csv](file:///c:/Users/Astha/github/test1/maps/website/docs/data/csv/pc_14.csv) (48 KB, 543 records)
- **Geospatial Layer**: [pc_14.geojson](file:///c:/Users/Astha/github/test1/maps/website/docs/data/geojson/pc_14.geojson) (39.3 MB)

### Assembly Constituencies (Vidhan Sabha)
- **Total Constituencies**: 4,120 across all states
- **Geospatial Layer**: [ac.geojson](file:///c:/Users/Astha/github/test1/maps/website/docs/data/geojson/ac.geojson) (18.1 MB)

---

## 4. Railways Network & Zonal Architecture

*Dedicated Tabular File*: [india_railway_zones_and_divisions.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/india_railway_zones_and_divisions.csv)  
*Structured JSON Profile*: [india_railways_profile.json](file:///c:/Users/Astha/github/test1/maps/isolated_data/india_railways_profile.json)

### National Railway Statistics
- **Total Route Kilometers**: **~68,043 km** (4th largest railway network in the world)
- **Total Running Track Length**: ~102,831 km
- **Electrification**: Over 94%+ electrified (rapidly progressing to 100%)
- **Total Railway Stations**: ~7,325 stations
- **Daily Volume**: ~23+ million passengers and 3+ million tonnes of freight daily across 13,500+ passenger trains and 9,000+ freight trains.

### All 18 Indian Railway Zones & Divisions

| Zone Code | Zone Name | Headquarters | Founded | Divisions | Route Km (approx) | States Covered |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CR** | Central Railway | Mumbai (CSMT) | 1951 | Mumbai, Bhusawal, Pune, Solapur, Nagpur | 4,151 km | Maharashtra, MP, Karnataka |
| **ECoR** | East Coast Railway | Bhubaneswar | 2003 | Khurda Road, Sambalpur, Waltair | 2,754 km | Odisha, Andhra Pradesh, Chhattisgarh |
| **ECR** | East Central Railway | Hajipur | 2002 | Danapur, Dhanbad, Pt. Deen Dayal Upadhyaya, Samastipur, Sonpur | 4,128 km | Bihar, Jharkhand, UP, MP |
| **ER** | Eastern Railway | Kolkata | 1952 | Howrah, Sealdah, Asansol, Malda | 2,718 km | West Bengal, Bihar, Jharkhand |
| **NCR** | North Central Railway | Prayagraj | 2003 | Prayagraj, Agra, Jhansi | 3,222 km | Uttar Pradesh, MP, Rajasthan, Haryana |
| **NER** | North Eastern Railway | Gorakhpur | 1952 | Izzatnagar, Lucknow, Varanasi | 3,885 km | Uttar Pradesh, Bihar, Uttarakhand |
| **NFR** | Northeast Frontier Railway | Guwahati | 1958 | Alipurduar, Katihar, Lumding, Rangiya, Tinsukia | 4,152 km | Assam, West Bengal, Bihar, NE States |
| **NR** | Northern Railway | New Delhi | 1952 | Delhi, Ambala, Firozpur, Lucknow, Moradabad | 7,319 km | Delhi, Haryana, Punjab, UP, HP, J&K, Ladakh |
| **NWR** | North Western Railway | Jaipur | 2002 | Jaipur, Ajmer, Bikaner, Jodhpur | 5,559 km | Rajasthan, Gujarat, Punjab, Haryana |
| **SCR** | South Central Railway | Secunderabad | 1966 | Secunderabad, Hyderabad, Vijayawada, Guntakal, Guntur, Nanded | 6,124 km | Telangana, Andhra Pradesh, Maharashtra, Karnataka |
| **SECR** | South East Central Railway | Bilaspur | 2003 | Bilaspur, Raipur, Nagpur | 2,447 km | Chhattisgarh, MP, Maharashtra, Odisha |
| **SER** | South Eastern Railway | Kolkata | 1955 | Adra, Chakradharpur, Kharagpur, Ranchi | 2,713 km | West Bengal, Jharkhand, Odisha |
| **SWR** | South Western Railway | Hubballi | 2003 | Hubballi, Bengaluru, Mysuru | 3,566 km | Karnataka, Goa, Maharashtra, Tamil Nadu |
| **SR** | Southern Railway | Chennai Central | 1951 | Chennai, Tiruchirappalli, Madurai, Palakkad, Salem, Thiruvananthapuram | 5,079 km | Tamil Nadu, Kerala, Puducherry, Andhra Pradesh |
| **WCR** | West Central Railway | Jabalpur | 2003 | Jabalpur, Bhopal, Kota | 2,997 km | MP, Rajasthan, UP |
| **WR** | Western Railway | Mumbai (Churchgate)| 1951 | Mumbai Central, Vadodara, Ratlam, Ahmedabad, Rajkot, Bhavnagar | 6,509 km | Maharashtra, Gujarat, Rajasthan, MP |
| **MR** | Metro Railway | Kolkata | 2010 | Kolkata Metro Lines | 39 km | West Bengal |
| **SCoR** | South Coast Railway | Visakhapatnam | 2019 | Vijayawada, Guntur, Guntakal | 3,496 km | Andhra Pradesh, Telangana |

---

## 5. Geospatial Boundaries Available in Repository

1. **Composite National Boundary**:
   - File: [india-composite.geojson](file:///c:/Users/Astha/github/test1/maps/Country/india-composite.geojson) (10.76 MB)
   - Official national outline including all disputed territories as per official Indian cartographic specifications.
2. **Simplified Land Boundary**:
   - File: [india-land-simplified.geojson](file:///c:/Users/Astha/github/test1/maps/Country/india-land-simplified.geojson) (44.6 KB)
   - Lightweight LineString border ideal for fast web rendering and overview maps.
3. **OpenStreetMap Variant**:
   - File: [india-osm.geojson](file:///c:/Users/Astha/github/test1/maps/Country/india-osm.geojson) (6.65 MB)
4. **Survey of India Variant**:
   - File: [india-soi.geojson](file:///c:/Users/Astha/github/test1/maps/Country/india-soi.geojson) (12.33 MB)

---

## 6. Direct Files Available in Workspace

- [INDIA_DATA.md](file:///c:/Users/Astha/github/test1/maps/isolated_data/INDIA_DATA.md) (National Master Markdown Profile)
- [india_census.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/india_census.csv) (Census demographics CSV)
- [india_railway_zones_and_divisions.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/india_railway_zones_and_divisions.csv) (Tabular 18 Zones and Divisions table)
- [india_railways_profile.json](file:///c:/Users/Astha/github/test1/maps/isolated_data/india_railways_profile.json) (Machine-readable network JSON)
- [india_isolated_dataset.json](file:///c:/Users/Astha/github/test1/maps/isolated_data/india_isolated_dataset.json) (National metadata JSON)
