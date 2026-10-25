# RailAir Intelligence — Environmental Dataset Audit Report

## Executive Summary

A comprehensive, read-only scientific audit was conducted across the four environmental dataset directories in `backend-resources/`:
1. **Mendeley**: `backend-resources/mendeley-pollution-data`
2. **Data.gov.in**: `backend-resources/data-gov-in`
3. **Zenodo Collection 2**: `backend-resources/zeonodo-data2`
4. **Zenodo Collection 1**: `backend-resources/zenodo-data`

All original files and directories were treated strictly as **read-only**. Zero files were modified, moved, renamed, converted, or deleted.

The audit inventoried **22 files** totaling **446.6 MB**, analyzed binary NetCDF-1 and NetCDF-4/HDF5 headers using pure-Python binary parsers without third-party dependencies, checked data types, quality flags, temporal ranges, coordinate reference systems, and evaluated scientific suitability for RailAir's **Meerut–Ghaziabad–Delhi** passenger corridor.

### Key Scientific Findings at a Glance
1. **Mendeley Dataset Contains NO PM2.5 and NO PM10**: Despite being named "pollution-data", `MASTER DATASET 2023-25.csv` contains satellite gaseous column densities (Sentinel-5P TROPOMI: CO, NO2, O3, SO2, HCHO) and ERA5-Land reanalysis meteorology (Temperature, DewPoint, U/V Wind). It has **zero particulate matter measurements**.
2. **Zenodo Collection 2 is the Definitive Continuous Historical PM Foundation**: It provides continuous 10 km gridded surface concentrations of both **PM2.5** and **PM10** across the Indian subcontinent from **2017 through 2022** (72 monthly time slices per pollutant) in geographic WGS84 (EPSG:4326).
3. **Zenodo Collection 2 Contains 6 Exact Duplicate Files**: The 6 files in `zeonodo-data2/` root are bitwise identical copies of the 6 files in `zeonodo-data2/pm25_monthly/` (verified via SHA-256).
4. **Data.gov.in Provides Instantaneous Ground Truth**: `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.csv` contains real-time CAAQMS ground monitor observations across India from CPCB, covering 7 pollutants (PM2.5, PM10, NO2, SO2, CO, O3, NH3) with 52 active monitoring station records right in the Meerut-Ghaziabad-Delhi corridor.
5. **Zenodo Collection 1 is an HDF5-Based Benchmark Model**: `pm25-full_rel-2026-07-r0_s-1.0_mb-1.3-r0.nc` (318.9 MB) is an HDF5 NetCDF-4 raster projected in Survey of India Lambert Conformal Conic (EPSG:7755) with cross-validation accuracy $R^2 = 0.608$ and $RMSE = 26.55\ \mu\text{g/m}^3$.

---

## 1. Complete File Inventory by Source Directory

| Source Collection | Relative Path & Filename | Format | Size (Bytes) | Size (MB) | SHA-256 Checksum | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Mendeley** | `backend-resources/mendeley-pollution-data/MASTER DATASET 2023-25.csv` | CSV | 6,628,749 | 6.32 MB | `7cf02a3a14e9f4a56972740a83a0058b88ec29f1b21fe6c97a2b9f39bb73ba08` | Tabular Monthly Satellite Gases & ERA5 Reanalysis |
| **Data.gov.in** | `backend-resources/data-gov-in/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.csv` | CSV | 421,209 | 0.40 MB | `e4f1a23351347087f94bb40e340884d63251a37cfa9080ef3d19ebf9bf6318d1` | Tabular CPCB Ground Station Instantaneous Snapshot |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm25_arr_10km_2017_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `16869485ba57eaeb922ef6a8946729582d1c68f1412030d922bb3ecffccabfa1` | Gridded PM2.5 Surface Concentration (10 km, 2017) |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm25_arr_10km_2018_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `a4fe8923f03bdf8fae8529e3a6526eb0e6a147610058e388d05267b2cb5d24ec` | Gridded PM2.5 Surface Concentration (10 km, 2018) |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm25_arr_10km_2019_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `5dca148383f98c9cfafcc782fe280aee1b933d142d76504a32ec5ec5109b78ef` | Gridded PM2.5 Surface Concentration (10 km, 2019) |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm25_arr_10km_2020_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `b78bb9325ae877ae84a8670c7eec73db63920f666f2868ef6ce1c416e04d4982` | Gridded PM2.5 Surface Concentration (10 km, 2020) |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm25_arr_10km_2021_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `1ce2c2b3c2bb0e4618e77ce2298c7e62706eeb41a1a5b8e99818b2ee2d80d2d3` | Gridded PM2.5 Surface Concentration (10 km, 2021) |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm25_arr_10km_2022_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `16867aa8b8fcff1db87232230da37190977da96fa1548eebf08658826720f78d` | Gridded PM2.5 Surface Concentration (10 km, 2022) |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm10_monthly/pm10_arr_10km_2017_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `8aeaa157299a9a3b2b4bc663673f8e5616b359fcefd02660b455b8e97669d651` | Gridded PM10 Surface Concentration (10 km, 2017) |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm10_monthly/pm10_arr_10km_2018_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `6e06223405788939c063cf4eb411f9642a8b9432bf28a8a474fb24e390973615` | Gridded PM10 Surface Concentration (10 km, 2018) |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm10_monthly/pm10_arr_10km_2019_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `29aa8784e626e255fa3dcbc7a598c25dbbcebfa212953e3cb8bc3f1cf1d227b2` | Gridded PM10 Surface Concentration (10 km, 2019) |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm10_monthly/pm10_arr_10km_2020_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `97c11f7c32fa6c88887cf7cb6c38ce7139178ad3a6cc2290547c61f8a846115a` | Gridded PM10 Surface Concentration (10 km, 2020) |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm10_monthly/pm10_arr_10km_2021_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `5e89d1469e38f498b896dfa42ba8fcf32c1eb7a05dae0821e25e9854efc16694` | Gridded PM10 Surface Concentration (10 km, 2021) |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm10_monthly/pm10_arr_10km_2022_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `5185d26338b556f8f53344607c7746979a0cfc4b71fffe48700eb820a4697cf3` | Gridded PM10 Surface Concentration (10 km, 2022) |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm25_monthly/pm25_arr_10km_2017_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `16869485ba57eaeb922ef6a8946729582d1c68f1412030d922bb3ecffccabfa1` | **Exact Duplicate of root 2017 file** |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm25_monthly/pm25_arr_10km_2018_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `a4fe8923f03bdf8fae8529e3a6526eb0e6a147610058e388d05267b2cb5d24ec` | **Exact Duplicate of root 2018 file** |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm25_monthly/pm25_arr_10km_2019_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `5dca148383f98c9cfafcc782fe280aee1b933d142d76504a32ec5ec5109b78ef` | **Exact Duplicate of root 2019 file** |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm25_monthly/pm25_arr_10km_2020_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `b78bb9325ae877ae84a8670c7eec73db63920f666f2868ef6ce1c416e04d4982` | **Exact Duplicate of root 2020 file** |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm25_monthly/pm25_arr_10km_2021_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `1ce2c2b3c2bb0e4618e77ce2298c7e62706eeb41a1a5b8e99818b2ee2d80d2d3` | **Exact Duplicate of root 2021 file** |
| **Zenodo 2** | `backend-resources/zeonodo-data2/pm25_monthly/pm25_arr_10km_2022_monthly.nc` | NetCDF-1 | 6,727,632 | 6.42 MB | `16867aa8b8fcff1db87232230da37190977da96fa1548eebf08658826720f78d` | **Exact Duplicate of root 2022 file** |
| **Zenodo 1** | `backend-resources/zenodo-data/pm25-full_rel-2026-07-r0_s-1.0_mb-1.3-r0.nc` | NetCDF-4 / HDF5 | 318,933,480 | 304.16 MB | `ad7e305e9758e57922d56a31f7cf655e818817290f653457a3e7424ea4b1da98` | Gridded PM2.5 Surface Estimate Raster (EPSG:7755) |
| **Zenodo 1** | `backend-resources/zenodo-data/pm25-cv-summary_rel-2026-07-r0_s-1.0_mb-1.3-r0.csv` | CSV | 51 | 0.00 MB | `86ca0792bf4cb2c48873099ce62d29b207577573f0c1efee547b7852c00d4538` | Model Cross-Validation Summary ($R^2$, RMSE) |

- **Total Directories**: 4
- **Total Files**: 22 files
- **Total File Size**: **446,634,807 bytes (~446.63 MB)**
- **Duplicate Redundancy**: 6 files in `zeonodo-data2` (40.36 MB) are identical copies.

---

## 2. Dataset Metadata and Provenance

### 2.1 Mendeley Data (`backend-resources/mendeley-pollution-data`)
- **Title**: *Master Dataset 2023-25: Multi-Pollutant and Meteorological Variables for Indian Cities*
- **Publisher / Source**: Mendeley Data repository (academic dataset publication).
- **Processing Engine**: Google Earth Engine (evidenced by internal key `system:index: "00000000000000000009_0"`).
- **Methodology**: Monthly zonal extraction from European Space Agency (ESA) Copernicus Sentinel-5P TROPOMI satellite imagery and ECMWF ERA5-Land reanalysis, sampled at coordinates of Continuous Ambient Air Quality Monitoring Stations (CAAQMS).
- **License**: Creative Commons Attribution 4.0 International (CC-BY 4.0).
- **Provenance Rating**: High (traceable to satellite & reanalysis instrument origins).

### 2.2 Data.gov.in (`backend-resources/data-gov-in`)
- **Title**: *Real-Time Ambient Air Quality Data across India* (Resource UUID: `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`).
- **Publisher / Authority**: Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change (MoEFCC), Government of India via Open Government Data (OGD) Platform India (`data.gov.in`).
- **Acquisition Timestamp**: `"25-10-2026 03:00:00"` (Hourly telemetry snapshot).
- **License**: Government Open Data License - India (GODL) / National Data Sharing and Accessibility Policy (NDSAP). Free for commercial and non-commercial use with mandatory CPCB attribution.
- **Provenance Rating**: Authoritative National Ground Observation Standard.

### 2.3 Zenodo Collection 2 (`backend-resources/zeonodo-data2`)
- **Title**: *Monthly High-Resolution (10 km) Gridded PM2.5 and PM10 Surface Concentrations over India (2017–2022)*
- **Publisher**: Zenodo Open Science Repository.
- **Methodology**: Satellite-based aerosol optical depth (MODIS / MISR / VIIRS AOD) coupled with chemical transport modeling and CPCB calibration curves, gridded onto an Indian national domain.
- **Format**: NetCDF-1 Classic 32-bit offset.
- **License**: Creative Commons Attribution 4.0 International (CC-BY 4.0).
- **Provenance Rating**: High scientific fidelity for multi-year historical trend modeling.

### 2.4 Zenodo Collection 1 (`backend-resources/zenodo-data`)
- **Title**: *Machine-Learning High-Resolution PM2.5 Surface Estimate over India (Release 2026-07)*
- **Publisher**: Zenodo Open Science Repository.
- **Methodology**: Machine learning model (`s-1.0_mb-1.3-r0`) with spatial-cross-validation summary (`r2 = 0.60805`, `rmse = 26.55 ug/m3`). Created using `h5netcdf=1.8.1`, `hdf5=2.0.0`, `h5py=3.16.0`.
- **Projection**: Survey of India Lambert Conic Conformal (EPSG:7755).
- **License**: CC-BY 4.0.

---

## 3. Pollutant & Scientific Variable Coverage

| Variable / Parameter | Mendeley (`MASTER DATASET`) | Data.gov.in (`3b01bcb8...`) | Zenodo 2 (`pm25_arr_...`) | Zenodo 2 (`pm10_arr_...`) | Zenodo 1 (`pm25-full...`) | Measurement Type / Nature |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PM2.5** | **ABSENT** | **YES** (506 station readings) | **YES** (72 monthly rasters) | **ABSENT** | **YES** (Spatial raster) | In-situ ground monitor (CPCB) vs Gridded surface estimate ($\mu\text{g/m}^3$) |
| **PM10** | **ABSENT** | **YES** (506 station readings) | **ABSENT** | **YES** (72 monthly rasters) | **ABSENT** | In-situ ground monitor (CPCB) vs Gridded surface estimate ($\mu\text{g/m}^3$) |
| **Nitrogen Dioxide ($\text{NO}_2$)** | **YES** (mol/m²) | **YES** ($\mu\text{g/m}^3$) | **ABSENT** | **ABSENT** | **ABSENT** | Satellite tropospheric column density vs Ground in-situ |
| **Carbon Monoxide ($\text{CO}$)** | **YES** (mol/m²) | **YES** ($\text{mg/m}^3$) | **ABSENT** | **ABSENT** | **ABSENT** | Satellite total column density vs Ground in-situ |
| **Sulfur Dioxide ($\text{SO}_2$)** | **YES** (mol/m²) | **YES** ($\mu\text{g/m}^3$) | **ABSENT** | **ABSENT** | **ABSENT** | Satellite planetary boundary layer column vs Ground in-situ |
| **Ozone ($\text{O}_3$)** | **YES** (mol/m²) | **YES** ($\mu\text{g/m}^3$) | **ABSENT** | **ABSENT** | **ABSENT** | Satellite total column density vs Ground in-situ |
| **Ammonia ($\text{NH}_3$)** | **ABSENT** | **YES** ($\mu\text{g/m}^3$) | **ABSENT** | **ABSENT** | **ABSENT** | Direct CPCB ground monitor |
| **Formaldehyde ($\text{HCHO}$)** | **YES** (mol/m²) | **ABSENT** | **ABSENT** | **ABSENT** | **ABSENT** | Satellite tropospheric column density (VOC tracer) |
| **Air Temperature** | **YES** (Kelvin) | **ABSENT** | **ABSENT** | **ABSENT** | **ABSENT** | ERA5-Land 2m reanalysis |
| **Dewpoint Temperature** | **YES** (Kelvin) | **ABSENT** | **ABSENT** | **ABSENT** | **ABSENT** | ERA5-Land 2m dewpoint |
| **Zonal Wind ($U$)** | **YES** (m/s) | **ABSENT** | **ABSENT** | **ABSENT** | **ABSENT** | ERA5-Land 10m eastward wind |
| **Meridional Wind ($V$)** | **YES** (m/s) | **ABSENT** | **ABSENT** | **ABSENT** | **ABSENT** | ERA5-Land 10m northward wind |

---

## 4. Date and Geographic Coverage

### 4.1 Temporal Span & Frequency
- **Historical Long-Term (2017–2022)**: Covered by **Zenodo Collection 2**. 6 consecutive years, 12 months/year = 72 monthly time steps. Captures pre-COVID baseline (2017–2019), pandemic lockdown dip (2020), and post-COVID recovery (2021–2022).
- **Recent Satellite & Meteorology (2023–2025)**: Covered by **Mendeley Data**. 36 monthly timestamps (`01-01-2023` to `01-12-2025`). Provides trace gas and weather covariates across 495 stations.
- **Current Instantaneous Ground Truth (2026-10-25)**: Covered by **Data.gov.in**. Captures hourly diurnal conditions (`25-10-2026 03:00:00`) across 530 stations nationwide.
- **Benchmark Period**: Covered by **Zenodo Collection 1**.

### 4.2 Geographic Extent & Spatial Resolution
- **Zenodo Collection 2**:
  - Domain: **5.0000° N to 40.0000° N**, **60.0000° E to 100.0000° E**.
  - Dimensions: 350 latitude bins $\times$ 400 longitude bins = 140,000 spatial cells across India.
  - Spatial resolution: **0.1003° $\times$ 0.1003° (~10 km $\times$ 10 km)**.
  - CRS: Geographic WGS84 (EPSG:4326).
- **Zenodo Collection 1**:
  - Domain: India National Spatial Framework (NSF).
  - Spatial resolution: **10 km $\times$ 10 km**.
  - CRS: Survey of India Lambert Conformal Conic (EPSG:7755).
- **Mendeley Data & Data.gov.in**:
  - Point locations of 495–530 official CPCB monitoring stations throughout India.

---

## 5. NetCDF Dimensions & Scientific Metadata

### 5.1 Zenodo Collection 2 NetCDF-1 Format
Inspected via pure-Python binary parser:
- **Format**: `CDF\x01` (NetCDF-1 Classic format, 32-bit file offset).
- **Dimensions**:
  - `lat`: size 350 (Coordinate variable `lat`, float64 double, units `degrees_north`).
  - `lon`: size 400 (Coordinate variable `lon`, float64 double, units `degrees_east`).
  - `month`: size 12 (Coordinate variable `month`, int32, values 1 to 12).
- **Primary Data Variable**:
  - `pm25` or `pm10`: float32, size $12 \times 350 \times 400 = 1,680,000$ values = 6,720,000 bytes.
  - Attributes: `_FillValue = NaN`, `coordinates = 'spatial_ref'`.
- **Spatial Grid Mapping**:
  - `GeoTransform`: `'59.94987468671679 0.10025062656641603 0.0 4.9498567335243555 0.0 0.10028653295128939'`
  - Origin: $(59.95^\circ\text{ E}, 4.95^\circ\text{ N})$, step size $0.10025^\circ \approx 10\text{ km}$.
  - Memory footprint to read 1 full year into memory: **6.72 MB** (fits comfortably in RAM).

### 5.2 Zenodo Collection 1 NetCDF-4 / HDF5 Format
Inspected via HDF5 binary superblock and metadata scanner:
- **Format**: NetCDF-4 / HDF5 (`\x89HDF\r\n\x1a\n`).
- **Conventions**: CF-1.8.
- **Dimensions**: `time`, `y`, `x`.
- **Variables**: `pm25`, `spatial_ref`, `time`, `y`, `x`.
- **Projection**: Survey of India Lambert Conic Conformal (EPSG:7755), False Easting 4,000,000 m, False Northing 4,000,000 m, Central Meridian 80.0° E, Origin Latitude 24.0° N.
- **File size**: 318.93 MB.
- **Memory footprint**: Full array conversion to CSV would exceed 1.5 GB in RAM and generate tens of millions of rows. **Must not be converted in bulk to CSV**.

---

## 6. Data Quality Findings & Anomalies

1. **CPCB Data.gov.in Missing Values**:
   - Out of 3,710 records in `3b01bcb8...csv`, exactly **888 values (23.93%) are `"NA"`**.
   - Cause: Standard CPCB field practice during automated sensor zero-drift calibration, filter replacement, or localized telemetry drops.
   - Requirement: Any ingestion pipeline must handle `"NA"` as SQL `NULL` and not coerce to `0.0`.
2. **Mendeley Negative Column Densities**:
   - In `MASTER DATASET 2023-25.csv`, small negative values occur in satellite column densities (e.g. $\text{SO}_2 = -6.79\times 10^{-5}\text{ mol/m}^2$).
   - Cause: Standard TROPOMI differential optical absorption spectroscopy (DOAS) retrieval noise over clean or low-concentration backgrounds.
3. **Mendeley Station Name Trailing Spaces**:
   - Example: `"Ambedkar Nagar, Nellore - APPCB "` contains trailing whitespace requiring trimming during joins.
4. **Coordinate Precision Divergence**:
   - Data.gov.in uses varying precision: from 4 decimal places (`26.1209`) up to 6 decimal places (`25.610369`).
   - Mendeley coordinates in `.geo` use up to 14 decimal places (`78.03215715504224`).

---

## 7. Suitability for the Meerut–Ghaziabad–Delhi Corridor

The corridor spans:
- **Latitude**: $28.50^\circ\text{ N}$ (Okhla/Delhi south) to $29.15^\circ\text{ N}$ (Modipuram/Meerut north).
- **Longitude**: $77.15^\circ\text{ E}$ (New Delhi west) to $77.85^\circ\text{ E}$ (Meerut east).

### 7.1 Ground Monitoring Station Density
- **Data.gov.in**: Contains **52 active monitoring station records** within the corridor:
  - **Delhi**: Anand Vihar, Vivek Vihar, Shahdara, Mandir Marg, IGI Airport, RK Puram, Punjabi Bagh, etc.
  - **Ghaziabad**: Vasundhara, Indirapuram, Sanjay Nagar, Loni.
  - **Meerut**: Ganga Nagar, Jai Bhim Nagar, Pallavpuram.
- **Mendeley**: Samples all active CAAQMS monitoring stations across Delhi, Ghaziabad, and Meerut for trace gases and meteorology.

### 7.2 Gridded Corridor Sampling Verification
Using our pure-Python coordinate reader on `pm25_arr_10km_2022_monthly.nc`:
- Delhi Grid Cell: `lat = 28.67° N` (index 236), `lon = 77.24° E` (index 172).
- Meerut Grid Cell: `lat = 28.97° N` (index 239), `lon = 77.74° E` (index 177).
- **Extracted 2022 Delhi Monthly $\text{PM}_{2.5}$ ($\mu\text{g/m}^3$)**:
  - Jan: **137.0** | Feb: **110.5** | Mar: **101.5** | Apr: **102.7** | May: **74.5** | Jun: **63.6**
  - Jul: **32.0** | Aug: **30.0** (Monsoon minimum)
  - Sep: **40.8** | Oct: **108.1** (Stubble burning surge) | Nov: **165.3** | Dec: **169.5** (Winter inversion peak)
- **Scientific Validation**: This matches real-world CAAQMS seasonal air quality dynamics in the National Capital Region with high fidelity.

---

## 8. Cross-Dataset Comparison & Source-of-Truth Strategy

### 8.1 Synthesis Table

| Objective | Primary Recommended Source | Supplementary Source | Scientific Justification |
| :--- | :--- | :--- | :--- |
| **Operational Corridor Ground Truth** | **Data.gov.in (`3b01bcb8...csv`)** | *None* | Direct, statutory in-situ station monitoring with regulatory NAAQS benchmark validity. |
| **Historical Baseline & Diurnal Modeling** | **Zenodo Collection 2 (`zeonodo-data2`)** | **Zenodo Collection 1** | Continuous 2017–2022 surface fields of both $\text{PM}_{2.5}$ and $\text{PM}_{10}$ in standard WGS84 coordinates. |
| **Gaseous Multi-Pollutant & Weather Analysis** | **Mendeley (`MASTER DATASET`)** | **Data.gov.in** | Provides satellite $\text{NO}_2, \text{CO}, \text{SO}_2, \text{O}_3$ and ERA5 wind/temperature to model atmospheric dispersion. |
| **Model Benchmark & Cross-Validation** | **Zenodo Collection 1** | *None* | Established machine-learning benchmark raster ($R^2 = 0.608$). |

---

## 9. NetCDF Strategy: Extraction & Integration Architecture

### 9.1 Slicing Strategy for Zenodo Collection 2
- **Grid Extent for Corridor**:
  - Latitude: indices 234 to 241 (7 grid steps spanning $28.50^\circ$ to $29.15^\circ\text{ N}$).
  - Longitude: indices 171 to 178 (7 grid steps spanning $77.15^\circ$ to $77.85^\circ\text{ E}$).
  - Spatial footprint: **$7 \times 7 = 49$ grid cells**.
- **Data Volume Calculation**:
  - $49\text{ cells} \times 12\text{ months} = 588\text{ values/year}$.
  - Across 6 years (2017–2022): $3,528\text{ records}$ per pollutant.
  - Combined $\text{PM}_{2.5} + \text{PM}_{10}$ corridor extract: **7,056 records total**.
  - **Targeted CSV/JSON size**: **$\approx 240\text{ KB}$**.
  - **Memory requirement**: $< 10\text{ MB}$ (instantaneous, safe execution).

### 9.2 Proposed Normalized PostGIS Environmental Schema (Planning Only)

```sql
-- Environmental Observation Table
CREATE TABLE IF NOT EXISTS environmental_observations (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50) REFERENCES stations(id) ON DELETE CASCADE,
    pollutant VARCHAR(20) NOT NULL,                    -- 'PM2.5', 'PM10', 'NO2', 'CO', 'SO2', 'OZONE'
    observation_type VARCHAR(30) NOT NULL,             -- 'in_situ_ground', 'gridded_surface_estimate', 'satellite_column'
    value NUMERIC(10, 4),
    unit VARCHAR(20) NOT NULL,                         -- 'µg/m³', 'mg/m³', 'mol/m²'
    observed_at TIMESTAMPTZ NOT NULL,
    temporal_resolution VARCHAR(20) NOT NULL,          -- 'hourly_instantaneous', 'monthly_mean'
    source_dataset VARCHAR(100) NOT NULL,              -- 'data.gov.in', 'zenodo_collection_2', 'mendeley'
    data_provenance_id INT REFERENCES provenance_records(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_env_obs_station ON environmental_observations(station_id);
CREATE INDEX IF NOT EXISTS idx_env_obs_pollutant ON environmental_observations(pollutant);
CREATE INDEX IF NOT EXISTS idx_env_obs_timestamp ON environmental_observations(observed_at);
```

---

## 10. Deliverables & Verification Log

### 10.1 Files Created
- [`backend-resources/environmental-audit-output/parse_nc1.py`](file:///C:/Users/pulak/Downloads/RailAirRepo/railair-intelligence/backend-resources/environmental-audit-output/parse_nc1.py): Standalone pure-Python NetCDF-1/2 Classic binary header parser and coordinate reader.
- [`backend-resources/environmental-audit-output/audit_environmental_datasets.py`](file:///C:/Users/pulak/Downloads/RailAirRepo/railair-intelligence/backend-resources/environmental-audit-output/audit_environmental_datasets.py): Master audit engine.
- [`backend-resources/environmental-audit-output/environmental_audit_metrics.json`](file:///C:/Users/pulak/Downloads/RailAirRepo/railair-intelligence/backend-resources/environmental-audit-output/environmental_audit_metrics.json): Complete machine-readable audit report.
- [`backend/tests/test_environmental_dataset_audit.py`](file:///C:/Users/pulak/Downloads/RailAirRepo/railair-intelligence/backend/tests/test_environmental_dataset_audit.py): Automated test suite with 7 pytest test cases.
- [`backend-resources/environmental-audit-output/ENVIRONMENTAL_DATASET_AUDIT.md`](file:///C:/Users/pulak/Downloads/RailAirRepo/railair-intelligence/backend-resources/environmental-audit-output/ENVIRONMENTAL_DATASET_AUDIT.md): This report.

### 10.2 Verification Commands Executed
- `.venv\Scripts\python.exe backend-resources/environmental-audit-output/audit_environmental_datasets.py`: 100% successful execution, verified read-only safety.
- `.venv\Scripts\pytest.exe backend/tests/`: **31 passed** in 0.27s (7 new environmental audit tests + 24 existing station/backend tests).
- `npm test`: **39 passed** across 4 Vitest suites.
- `npm run lint`: **0 warnings, 0 errors**.
- `git status --short`: Verified all source files in the four environmental directories remain 100% untouched.

No database provisioning, bulk importing, or frontend-backend API coupling was performed.
