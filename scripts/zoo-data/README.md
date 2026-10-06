# WildAtlas (WATLAS) — Complete Worldwide Zoo Dataset Module

An isolated, reproducible dataset module providing complete worldwide Zoo and Zoo-Animal records extracted directly from the official **Wikidata SPARQL Query Service**.

---

## 1. Data Source & Endpoint

* **Primary Source:** [Wikidata](https://www.wikidata.org/)
* **SPARQL Endpoint:** `https://query.wikidata.org/sparql`
* **Licensing:** [Creative Commons CC0 1.0 Universal Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/)
* **Extraction Date:** September 13, 2026
* **Academic Project:** WildAtlas (WATLAS) MCA Project
* **Coverage:** Maximum worldwide coverage available from Wikidata across 146 countries.

---

## 2. Dataset Architecture & Fields

The dataset is partitioned into two normalized relational CSV files residing in `/data/zoo/`:

### A. `zoos.csv` (2,983 Records)
Contains geographical, administrative, and identifier metadata for worldwide zoological gardens, public aquariums, wildlife reserves, safari parks, aviaries, and specialized facilities.

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `zoo_id` | String | Unique entity identifier (Wikidata Q-ID) | `Q154828` |
| `zoo_name` | String | Canonical multilingual/English name of the zoo | `Berlin Zoological Garden` |
| `city` | String | City or local municipality location | `Berlin` |
| `state_province`| String | State, province, or administrative district | `Berlin` |
| `country` | String | Sovereign country name | `Germany` |
| `latitude` | Float | Decimal WGS84 latitude coordinate | `52.507777777` |
| `longitude` | Float | Decimal WGS84 longitude coordinate | `13.337777777` |
| `wikidata_id` | String | Preserved Wikidata entity Q-ID | `Q154828` |
| `source` | String | Attribution source label | `Wikidata` |

### B. `zoo_animals.csv` (543 Records)
Contains individual biological animal and taxon records residing in, born at, or associated with zoos worldwide.

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `zoo_id` | String | Foreign key linking to `zoos.csv` | `Q154828` |
| `animal_name` | String | Name of the individual specimen / taxon | `Knut` |
| `scientific_name`| String | Biological scientific taxon name | `Ursus maritimus` |
| `animal_category`| String | High-level classification (Mammal, Bird, Reptile, etc.) | `Mammal` |
| `animal_wikidata_id` | String | Wikidata entity Q-ID for animal or taxon | `Q157990` |
| `source` | String | Attribution source label | `Wikidata` |

---

## 3. Extraction Methodology & Categorical Batching

To avoid Blazegraph query timeouts on Wikidata's public endpoint, the extraction pipeline executes categorical queries across all recognized subclasses of Zoo (`wd:Q43501`):

1. **Core Zoological Gardens:** `wd:Q43501`, `wd:Q3363934`, `wd:Q1509615`, `wd:Q1401536`, `wd:Q2548054`
2. **Public Aquariums & Oceanariums:** `wd:Q2281788`, `wd:Q1443808`, `wd:Q664334`, `wd:Q491675`, `wd:Q15060435`
3. **Wildlife, Safari & Animal Theme Parks:** `wd:Q1711697`, `wd:Q642682`, `wd:Q3363974`, `wd:Q11298806`
4. **Specialized Aviaries, Butterfly & Reptile Facilities:** `wd:Q1995305`, `wd:Q1886911`, `wd:Q3243966`, `wd:Q5743687`, `wd:Q2351333`, `wd:Q9251669`
5. **Petting Zoos & Mini Zoos:** `wd:Q459886`, `wd:Q114049649`

Zoo animals are extracted via biological link properties (`wdt:P551` residence, `wdt:P19` birth, `wdt:P20` death), strictly excluding human entities (`wd:Q5`).

---

## 4. Cleaning, Deduplication & Validation Process

The automated validation tool ([`validate_zoo_data.py`](./validate_zoo_data.py)) audits the data against the following rules:

1. **Uniqueness:** Deduplicates records using Wikidata Q-IDs. (503 cross-class duplicates removed during extraction; 0 duplicates in final CSVs).
2. **Relationship Integrity:** Ensures no duplicated `(zoo_id, animal_wikidata_id)` links exist.
3. **Coordinate Bounds:** Asserts that latitude is within `[-90.0, 90.0]` and longitude within `[-180.0, 180.0]`.
4. **Non-Invented Missing Values:** Unannotated fields in Wikidata remain unpopulated rather than fabricated. No AI-generated or fictional records are injected.

---

## 5. Limitations & Academic Disclaimer

* **Coverage Scope:** This dataset contains **2,983** worldwide zoo facilities and **543** linked animal records across **146** countries. It represents all reliable zoo records available in Wikidata as of the extraction date. It does **not** claim to contain every zoo or every living animal worldwide.
* **Upstream Crowdsourcing:** Data reflects the current state of knowledge present in the Wikidata open knowledge base.

---

## 6. How to Run & Reproduce the Dataset

The scripts use Python 3.8+ standard libraries (`urllib`, `json`, `csv`, `re`) and require no third-party package installations.

### A. Run Full Worldwide Data Extraction
From the project root:
```bash
python scripts/zoo-data/fetch_wikidata_zoo.py
```

### B. Run Quality & Completeness Validation
```bash
python scripts/zoo-data/validate_zoo_data.py
```

### C. Output Artifacts
* Dataset: `data/zoo/zoos.csv`
* Linked Animals: `data/zoo/zoo_animals.csv`
* Text Validation Report: `data/zoo/validation-report.txt`
* Markdown Validation Report: `data/zoo/validation_report.md`
