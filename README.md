# WildAtlas: Global Forest & Wildlife Explorer
### Reproducible Geospatial Road Routing and Biodiversity Exploration via OpenStreetMap and OSRM

> **IEEE Paper Artifact & Reproducibility Package**  
> This repository contains the complete codebase, data loaders, vector/raster basemap configurations, OSRM road routing integration, evaluation benchmarks, and Docker orchestration for the IEEE research submission.

---

## 1. System Architecture & Constraints

- **Map Rendering Engine**: [Leaflet.js](https://leafletjs.com/) (`v1.9.4`, BSD-2-Clause) with [`leaflet.markercluster`](https://github.com/Leaflet/Leaflet.markercluster) (`v1.5.3`, MIT).
- **Vector Basemap Integration**: [MapLibre GL JS](https://maplibre.org/) (`v5.1.0`, BSD-3-Clause) bridged via [`@maplibre/maplibre-gl-leaflet`](https://github.com/maplibre/maplibre-gl-leaflet) (`v0.1.4`, ISC).
- **Cartographic Basemaps**:
  - **Primary (Clean Vector Road Basemap)**: OpenFreeMap Liberty style (`https://tiles.openfreemap.org/styles/liberty`), providing road hierarchy, highways, and place labels with no API key required.
  - **Fallback (Raster Tiles)**: OpenStreetMap Standard Tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`).
  - **Auto-Failover**: The map automatically detects WebGL unavailability or style fetch failures (>5 errors within 10s) and seamlessly transitions to the fallback layer with a non-blocking toast notification.
  - **Tile Provider Access Date**: `2026-10-02` (recorded for scientific citation).
  - **Deployment Note**: The public OpenStreetMap raster server is for local development and emergency fallback only. A dedicated self-hosted tile source (e.g. OpenMapTiles / TileServer GL) should be configured for production and paper replication.
- **Road Network Routing Engine**: [OSRM (Open Source Routing Machine)](http://project-osrm.org/) backend (`v5.27.1`, BSD-2-Clause) with Multi-Level Dijkstra (MLD) algorithm and car profile.
- **Strict Constraints**: Zero Google Maps APIs, Google Tiles, or proprietary paid map keys.

---

## 2. Dataset Normalization & Single Source of Truth

All forest reserve and zoological park records originate from curated dataset sources stored in `server/database/watlas.db` (SQLite) and associated CSV registries.

### Data Normalizer Schema
Every record is mapped through the unified normalizer (`client/src/services/datasetLoader.ts`) into:
```typescript
interface NormalizedPlace {
  id: string;
  type: 'forest' | 'zoo';
  name: string;
  continent: string;
  country: string;
  state: string; // state/region
  city: string;
  lat: number;
  lng: number;
  description: string;
  area?: string;
  climate?: string;
  entranceName: string;
  entranceLat: number;
  entranceLng: number;
  entranceSource?: string;
  species: string[];
}
```

### Coordinate Constraints & Validation
- **Latitude**: Strictly bound to `[-90.0 .. +90.0]`.
- **Longitude**: Strictly bound to `[-180.0 .. +180.0]`.
- **Coordinate Reference System (CRS)**: WGS 84 (`EPSG:4326`).
- **Deduplication**: Composite spatial key deduplication (`type:name:lat:lng`).
- **Hierarchical Indexing**: Hierarchical aggregates (Continents → Countries → States/Regions) are precomputed once on ingest and indexed into `Map` structures for $O(1)$ lookup with zero runtime re-filtering.

---

## 3. Navigation Flow (3-Level Drill-Down)

1. **Level 1 — World & Continents Overview**:
   - Macro view displaying interactive continent badges (North America, South America, Europe, Africa, Asia, Oceania, Antarctica).
   - Displays aggregated dataset counts (`🌳 X Forests, 🦁 Y Zoos`).
   - Clicking a continent flies/zooms smoothly to its spatial bounding box.
2. **Level 2 — Continent → Country → State/Region**:
   - Dynamic breadcrumb navigation (`Continents Overview > [Continent] > [Country] > [State]`).
   - Country dropdown and spatial state/region badges with aggregated counts.
3. **Level 3 — Pin Points & Clustered Markers**:
   - Clustered forest pins (green tree icon: 🌳) and zoo pins (amber lion icon: 🦁).
   - Filter toggle: `All` / `🌳 Forests` / `🦁 Zoos`.
   - Clicking a pin opens the side panel displaying reserve overview, exact coordinates, climate, area, and verified species list grouped by taxonomy (Mammals, Birds, Reptiles, Amphibians, Fish).
   - URL state reflects the current level (`?continent=...&country=...&state=...&forestId=...`) enabling bookmarking and browser back/forward buttons.

---

## 4. OSRM Road Routing Engine

- **Endpoint Format**:
  ```http
  GET /route/v1/driving/{startLng},{startLat};{endLng},{endLat}?overview=full&geometries=geojson&steps=true
  ```
- **Origin Selection**:
  - Primary: Browser geolocation (`navigator.geolocation`).
  - Fallback / Custom: Interactive "Click on Map to Select Start Point" mode or departure hub selection.
- **Destination**: Exact georeferenced coordinates of the selected forest reserve or zoological park.
- **Rendering**: GeoJSON LineString geometry rendered as a high-visibility cyan polyline (`#38bdf8`, weight 5) with high-contrast backing glow (`#0284c7`, weight 9).
- **Error Handling**: Gracefully handles disconnected oceanic queries (displaying "Destination is separated by water or not reachable by road"), rate limits, and network errors without application crashes.

---

## 5. Environment Variables & URL Configuration

Configure the following variables in `client/.env`:

| Variable | Description | Production Default | Dev Fallback (Demo) |
| :--- | :--- | :--- | :--- |
| `VITE_OSRM_BASE_URL` | Base URL of OSRM routing service | `http://localhost:5001` (Docker) | `http://localhost:5000/api/routes` |
| `VITE_MAP_STYLE_URL` | Primary vector basemap style JSON | `https://tiles.openfreemap.org/styles/liberty` | OpenFreeMap Liberty Style |
| `VITE_TILE_URL_FALLBACK` | Fallback raster tile source | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | OpenStreetMap Standard |

---

## 6. Self-Hosted OSRM & Docker Reproducibility

### A. Documented OSM Extract Details
- **Extract Source**: [Geofabrik OpenStreetMap Extracts](https://download.geofabrik.de/)
- **Recommended Extract**: `europe-latest.osm.pbf` or `planet-latest.osm.pbf` (or smaller test extract `monaco-latest.osm.pbf`)
- **OSRM Version**: `osrm/osrm-backend:v5.27.1`
- **Routing Algorithm**: Multi-Level Dijkstra (MLD)
- **Routing Profile**: `car.lua`

### B. Preprocessing the OSM Extract
```bash
# 1. Create OSRM data directory
mkdir -p data/osrm

# 2. Download sample extract (e.g. Monaco or full region)
curl -L -o data/osrm/extract.osm.pbf https://download.geofabrik.de/europe/monaco-latest.osm.pbf

# 3. Extract road network graph
docker run -t -v "${PWD}/data/osrm:/data" osrm/osrm-backend:v5.27.1 osrm-extract -p /opt/car.lua /data/extract.osm.pbf

# 4. Partition the graph (MLD)
docker run -t -v "${PWD}/data/osrm:/data" osrm/osrm-backend:v5.27.1 osrm-partition /data/extract.osrm

# 5. Customize the graph (MLD)
docker run -t -v "${PWD}/data/osrm:/data" osrm/osrm-backend:v5.27.1 osrm-customize /data/extract.osrm
```

### C. Running the Full Stack with Docker Compose
```bash
docker-compose up --build
```
- Web Application: `http://localhost:5000`
- Self-Hosted OSRM Backend: `http://localhost:5001`

---

## 7. Evaluation & Benchmark Tooling

### A. Dataset Quality Audit
Execute the automated dataset quality and coordinate boundary audit:
```bash
node scripts/evaluate_data_quality.js
```
- Outputs: `evaluation/data_quality_report.csv` and `evaluation/data_quality_report.json`.

### B. Empirical Performance Benchmark Suite
Execute the latency, render speed, and routing benchmark suite:
```bash
node scripts/run_benchmarks.js
```
- Outputs: `evaluation/benchmark_results.csv` and `evaluation/benchmark_results.json`.
- Evaluates:
  - Ingestion & indexing latency (ms)
  - DOM marker rendering with vs without clustering at 1,000, 10,000, and 50,000 points (ms)
  - OSRM Multi-Level Dijkstra routing response latency over fixed test pairs (ms)

### C. Automated Reproducibility Test Runner
```bash
node scripts/test_reproducibility.js
```
- Tests coordinate constraints, hierarchical aggregation, zero-haversine compliance, and OSRM error handling.

### D. System Usability Scale (SUS) Questionnaire
- Accessible in-app via the **"SUS Survey"** button in the header HUD.
- Computes standard ISO 9241-11 usability scores (0-100) and exports anonymous responses as JSON.

---

## 8. Data Attribution & Licenses

- **OpenStreetMap**: Data &copy; OpenStreetMap contributors, licensed under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).
- **OpenFreeMap**: Map style & vector tiles provided by OpenFreeMap based on OpenMapTiles data, licensed under ODbL / BSD.
- **Leaflet.js**: &copy; Vladimir Agafonkin, licensed under [BSD-2-Clause](https://github.com/Leaflet/Leaflet/blob/main/LICENSE).
- **MapLibre GL JS**: &copy; MapLibre contributors, licensed under [BSD-3-Clause](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt).
- **@maplibre/maplibre-gl-leaflet**: &copy; MapLibre contributors, licensed under [ISC License](https://github.com/maplibre/maplibre-gl-leaflet/blob/main/LICENSE).
- **Leaflet.markercluster**: &copy; Dave Leaver, licensed under [MIT License](https://github.com/Leaflet/Leaflet.markercluster/blob/master/MIT-LICENSE.txt).
- **OSRM**: &copy; Project OSRM contributors, licensed under [BSD-2-Clause](https://github.com/Project-OSRM/osrm-backend/blob/master/LICENSE.TXT).
- **Master Biodiversity Catalog**: Attributed to [GBIF](https://www.gbif.org/) and [IUCN Red List](https://www.iucnredlist.org/) under Open Access terms.
