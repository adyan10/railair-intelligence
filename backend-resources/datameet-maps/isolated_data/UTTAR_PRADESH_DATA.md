# State Dataset & Infrastructure Profile: Uttar Pradesh (UP)

This document provides a comprehensive, isolated dataset and analytical profile for **Uttar Pradesh**, combining administrative boundaries, demographics, electoral representation, geospatial layers, and railway infrastructure.

---

## 1. Overview & Geography
- **Entity**: State of Uttar Pradesh
- **Abbreviation**: UP
- **Census State Code**: 9
- **Capital**: Lucknow
- **Districts (Census 2011)**: 71 districts (reorganised into 75 administrative districts)
- **Bordering States & Entities**:
  - **States**: Uttarakhand, Himachal Pradesh, Haryana, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, Bihar
  - **Union Territory**: NCT of Delhi
  - **International**: Nepal along the northern border
- **Geographic Extent**:
  - Latitude: 23.87° N to 30.41° N
  - Longitude: 77.08° E to 84.64° E

---

## 2. Demographic Profile (Census 2001 & 2011)

Extracted from [statesCensus.csv](file:///c:/Users/Astha/github/test1/maps/website/docs/data/csv/statesCensus.csv):

| Metric | Census 2001 | Census 2011 | Change | National Comparison |
| :--- | :--- | :--- | :--- | :--- |
| **Sex Ratio** (females per 1,000 males) | **898** | **908** | **+10** | **-32 points below national avg (940)** |

*Dedicated Tabular File*: [uttar_pradesh_census.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_census.csv)

### Notable District Demographics (from [dists.csv](file:///c:/Users/Astha/github/test1/maps/website/docs/data/csv/dists.csv))
- **Lowest Literacy Rates**:
  - Shrawasti: **46.74%** (Sex Ratio: 881, Density: 681/km², Work Rate: 36.13%)
  - Bahraich: **49.36%** (Sex Ratio: 892, Density: 666/km², Work Rate: 33.03%)
  - Balrampur: **49.51%** (Sex Ratio: 928, Density: 642/km², Work Rate: 35.38%)
  - Budaun: **51.29%** (Sex Ratio: 871, Density: 712/km², Work Rate: 30.08%)
- **High Population Density Districts**:
  - Ghaziabad, Lucknow, Varanasi, Kanpur Nagar (exceeding 1,500+ persons/km²)

---

## 3. Political & Electoral Data

### Parliamentary Constituencies (Lok Sabha)
- **Total Seats**: 80 (Largest contingent in the Lok Sabha, ~14.73% of India's total 543 seats)
- **Seat Reservations**:
  - General: 63
  - Scheduled Caste (SC): 17
  - Scheduled Tribe (ST): 0
- **2014 Lok Sabha Election Results in UP**:
  - **BJP**: 71 seats
  - **SP**: 5 seats (Azamgarh, Badaun, Firozabad, Kannauj, Mainpuri)
  - **INC**: 2 seats (Amethi - Rahul Gandhi, Rae Bareli - Sonia Gandhi)
  - **Apna Dal**: 2 seats (Mirzapur, Pratapgarh)
  - **BSP**: 0 seats
- *Dedicated Tabular File*: [uttar_pradesh_parliamentary_constituencies_2014.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_parliamentary_constituencies_2014.csv) (80 constituencies with votes, winner, and runner-up details)

### Assembly Constituencies (Vidhan Sabha)
- **Total Seats**: 403 constituencies (single largest legislative assembly in India)
- Represented in [ac.geojson](file:///c:/Users/Astha/github/test1/maps/website/docs/data/geojson/ac.geojson).

---

## 4. Railways Network & Infrastructure

Uttar Pradesh holds the **longest railway network** of any state in India, serving as the central transport corridor connecting Northern, Eastern, and Western India.

### Network Statistics
- **Total Route Kilometers**: **~9,164 km** (Rank 1 in India, ~13.5% of Indian Railways network)
- **Electrification**: >98% broad-gauge electrified
- **Operational Stations**: Over 1,150+ railway stations across the state
- **Dedicated Freight Corridors (DFC)**: Meeting point of Eastern DFC (Ludhiana–Dankuni) and Western DFC (Dadri–JNPT Mumbai) at **Dadri (Greater Noida)**.

### Railway Zones Operating in Uttar Pradesh
1. **North Central Railway (NCR)** — **Headquarters at Prayagraj (Subedarganj)**
   - Divisions in UP: Prayagraj (PRYJ), Agra (AGC), Jhansi (VGLJ)
2. **North Eastern Railway (NER)** — **Headquarters at Gorakhpur**
   - Divisions in UP: Lucknow NER (LJN), Izzatnagar/Bareilly (IZN), Varanasi (BSB)
3. **Northern Railway (NR)** — Headquarters at New Delhi
   - Divisions in UP: Lucknow NR (LKO), Moradabad (MB), Delhi Division (Ghaziabad, Meerut)
4. **East Central Railway (ECR)** — Headquarters at Hajipur
   - Divisions in UP: Pt. Deen Dayal Upadhyaya (DDU), Dhanbad Division (Sonbhadra: Chopan, Renukoot)

---

## 5. Major Railway Junctions & Stations in Uttar Pradesh

*Spatial GeoJSON Layer*: [uttar_pradesh_railway_stations.geojson](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_railway_stations.geojson)  
*Tabular CSV File*: [uttar_pradesh_railway_stations.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_railway_stations.csv)

| Station Code | Station Name | Zone | Division | District | Coordinates (Lat, Lng) | Significance / Category |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CNB** | **Kanpur Central** | NCR | Prayagraj | Kanpur Nagar | 26.4539° N, 80.3512° E | 10 platforms, 300+ trains/day, Delhi-Howrah main artery |
| **DDU** | **Pt. Deen Dayal Upadhyaya Jn** | ECR | DDU | Chandauli | 25.2781° N, 83.1193° E | Asia's largest marshalling yard; Grand Chord gateway |
| **PRYJ** | **Prayagraj Junction** | NCR | Prayagraj | Prayagraj | 25.4449° N, 81.8340° E | Zonal HQ, confluence of 7 rail routes |
| **LKO** | **Lucknow Charbagh (NR)** | NR | Lucknow | Lucknow | 26.8315° N, 80.9229° E | Historic palace-style terminal complex |
| **LJN** | **Lucknow Junction (NER)** | NER | Lucknow | Lucknow | 26.8322° N, 80.9208° E | NER division terminal complex |
| **GKP** | **Gorakhpur Junction** | NER | Lucknow | Gorakhpur | 26.7593° N, 83.3815° E | Zonal HQ, 2nd longest platform in the world (1,366 m) |
| **BSB** | **Varanasi Junction** | NR | Lucknow | Varanasi | 25.3283° N, 82.9867° E | Major pilgrimage hub; Banaras Locomotive Works (BLW) |
| **BSBS** | **Banaras** | NER | Varanasi | Varanasi | 25.3090° N, 82.9644° E | Modernized satellite terminal |
| **VGLJ** | **Virangana Lakshmibai Jhansi** | NCR | Jhansi | Jhansi | 25.4484° N, 78.5528° E | Bundelkhand hub connecting North to South/West |
| **AGC** | **Agra Cantt** | NCR | Agra | Agra | 27.1583° N, 77.9906° E | Gateway to Taj Mahal, high-speed Gatimaan & Vande Bharat |
| **MTJ** | **Mathura Junction** | NCR | Agra | Mathura | 27.4924° N, 77.6737° E | 7-route junction connecting Delhi, Mumbai, Kasganj, Alwar |
| **GZB** | **Ghaziabad Junction** | NR | Delhi | Ghaziabad | 28.6657° N, 77.4326° E | High-density Delhi NCR mainline terminal |
| **MB** | **Moradabad Junction** | NR | Moradabad | Moradabad | 28.8315° N, 78.7764° E | Rohilkhand freight & passenger divisional headquarters |
| **BE** | **Bareilly Junction** | NR | Moradabad | Bareilly | 28.3414° N, 79.4189° E | Dual NR/NER junction connecting North & East |
| **ALJN** | **Aligarh Junction** | NCR | Prayagraj | Aligarh | 27.8974° N, 78.0772° E | Key junction on Delhi-Kanpur high-speed trunk route |
| **MTC** | **Meerut City** | NR | Delhi | Meerut | 28.9744° N, 77.6885° E | Western UP hub; connected to Delhi-Meerut RRTS |
| **SRE** | **Saharanpur Junction** | NR | Ambala | Saharanpur | 29.9641° N, 77.5458° E | Northern gateway linking Punjab, Haryana & UP |
| **AY** | **Ayodhya Dham Junction** | NR | Lucknow | Ayodhya | 26.7922° N, 82.1998° E | Major redeveloped pilgrimage terminal |
| **GD** | **Gonda Junction** | NER | Lucknow | Gonda | 27.1306° N, 81.9619° E | Awadh gateway connecting Nepal border lines |
| **BST** | **Basti** | NER | Lucknow | Basti | 26.7997° N, 82.7383° E | Gorakhpur-Lucknow main artery |
| **DEOS** | **Deoria Sadar** | NER | Varanasi | Deoria | 26.5077° N, 83.7820° E | Eastern UP trunk line junction |
| **MAU** | **Mau Junction** | NER | Varanasi | Mau | 25.9514° N, 83.5606° E | Connecting Varanasi, Gorakhpur, and Shahganj |
| **BUI** | **Ballia** | NER | Varanasi | Ballia | 25.7597° N, 84.1503° E | Easternmost border junction connecting Bihar |
| **JNU** | **Jaunpur Junction** | NR | Lucknow | Jaunpur | 25.7335° N, 82.6836° E | Historic Gomti river railway junction |
| **SLN** | **Sultanpur Junction** | NR | Lucknow | Sultanpur | 26.2648° N, 82.0727° E | Central UP junction linking Lucknow to Varanasi |
| **RBL** | **Rae Bareli Junction** | NR | Lucknow | Rae Bareli | 26.2236° N, 81.2403° E | Location of Modern Coach Factory (MCF Lalganj) |
| **ON** | **Unnao Junction** | NR | Lucknow | Unnao | 26.5458° N, 80.4936° E | High-density twin-city corridor (Kanpur-Lucknow) |
| **FTP** | **Fatehpur** | NCR | Prayagraj | Fatehpur | 25.9267° N, 80.8142° E | Key station on Delhi-Howrah route |
| **SPN** | **Shahjahanpur** | NR | Moradabad | Shahjahanpur | 27.8804° N, 79.9122° E | Connecting Bareilly, Sitapur, and Lucknow |
| **HRI** | **Hardoi** | NR | Moradabad | Hardoi | 27.3947° N, 80.1311° E | Mainline node between Bareilly and Lucknow |
| **STP** | **Sitapur Junction** | NER | Lucknow | Sitapur | 27.5684° N, 80.6826° E | Confluence of 4 rail lines |
| **PBE** | **Pilibhit Junction** | NER | Izzatnagar | Pilibhit | 28.6150° N, 79.8139° E | Terai region junction connecting Bareilly & Tanakpur |
| **BNDA** | **Banda Junction** | NCR | Jhansi | Banda | 25.4756° N, 80.3344° E | Bundelkhand central junction |
| **MBA** | **Mahoba Junction** | NCR | Jhansi | Mahoba | 25.3069° N, 79.8491° E | Junction for Khajuraho branch line |
| **ETW** | **Etawah Junction** | NCR | Prayagraj | Etawah | 26.7761° N, 79.0264° E | Delhi-Howrah mainline junction linking Gwalior/Mainpuri |
| **TDL** | **Tundla Junction** | NCR | Prayagraj | Firozabad | 27.2078° N, 78.2417° E | Major bypass junction for Agra traffic |
| **KSJ** | **Kasganj Junction** | NER | Izzatnagar | Kasganj | 27.8081° N, 78.6475° E | Historic meter-gauge turned broad-gauge junction |
| **FBD** | **Farrukhabad Junction** | NER | Izzatnagar | Farrukhabad | 27.3917° N, 79.5806° E | Ganga basin textile and potato transport hub |
| **HPU** | **Hapur Junction** | NR | Moradabad | Hapur | 28.7306° N, 77.7781° E | Western UP confluence for Moradabad, Meerut, Delhi |
| **MZP** | **Mirzapur** | NCR | Prayagraj | Mirzapur | 25.1464° N, 82.5694° E | Indian Standard Time (IST) meridian (82.5° E) junction |
| **CPU** | **Chopan** | ECR | Dhanbad | Sonbhadra | 24.5200° N, 83.0300° E | Energy capital junction for coal & thermal plants |
| **RNQ** | **Renukoot** | ECR | Dhanbad | Sonbhadra | 24.2189° N, 83.0317° E | Industrial center near Rihand Dam and Hindalco |

---

## 6. Geospatial Map Layers & GIS Integration

To render Uttar Pradesh maps and railway networks in GIS tools (QGIS, Mapshaper, Leaflet, Kepler.gl):

### Recommended Layering Hierarchy:
```
1. Top Layer (Points):       isolated_data/uttar_pradesh_railway_stations.geojson
2. Middle Layer (Polygons):  website/docs/data/geojson/dists11.geojson (71 UP Districts)
3. Base Layer (Outline):     website/docs/data/geojson/states.geojson (Feature Line 37)
```

### Direct Workspace File Links:
- [uttar_pradesh_railway_stations.geojson](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_railway_stations.geojson) (Spatial point layer)
- [uttar_pradesh_railway_stations.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_railway_stations.csv) (Tabular station catalog)
- [uttar_pradesh_railways_profile.json](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_railways_profile.json) (Machine-readable network JSON)
- [uttar_pradesh_census.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_census.csv) (Census demographics CSV)
- [uttar_pradesh_parliamentary_constituencies_2014.csv](file:///c:/Users/Astha/github/test1/maps/isolated_data/uttar_pradesh_parliamentary_constituencies_2014.csv) (80 Lok Sabha seats)
- [extract_isolated_data.ps1](file:///c:/Users/Astha/github/test1/maps/extract_isolated_data.ps1) (Batch extraction automation script)
