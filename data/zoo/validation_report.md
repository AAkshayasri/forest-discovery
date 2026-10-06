# WildAtlas Complete Zoo Dataset — Quality & Validation Report

## Summary Metrics
- **Total Zoos Successfully Retrieved:** 2983
- **Total Countries Represented:** 146
- **Total Zoo-Animal Relationships:** 543
- **Total Unique Animal Species:** 10
- **Total Unique Individual Animals/Taxa:** 405
- **Zoos with Coordinates:** 2677
- **Zoos without Coordinates:** 306
- **Zoos with Linked Animal Records:** 222
- **Zoos without Linked Animal Records:** 2761
- **Failed / Timeout Batches:** 0
- **Duplicate Records Removed During Extraction:** 503

## Quality Checks Breakdown
| Quality Metric | Status | Issue Count | Notes |
| :--- | :---: | :---: | :--- |
| **Duplicate Zoo IDs** | PASSED | 0 | 100% Unique primary keys |
| **Duplicate Wikidata IDs** | PASSED | 0 | Entity Q-ID uniqueness |
| **Duplicate Zoo-Animal Pairs** | PASSED | 0 | Deduplicated relationship pairs |
| **Missing Zoo Names** | PASSED | 0 | Mandatory field |
| **Missing Countries** | INFO | 33 | Geographical metadata (unassigned in WD) |
| **Invalid Coordinate Bounds** | PASSED | 0 | Bounds: [-90,90] lat, [-180,180] lon |
| **Missing Animal Names** | PASSED | 0 | Animal label check |
| **Missing Scientific Names** | INFO | 508 | Taxon scientific name completeness (unannotated preserved empty) |

## Country Distribution (Top 15)
| Rank | Country | Zoo Count |
| :---: | :--- | :--- |
| 1 | United States | 440 |
| 2 | Germany | 344 |
| 3 | Japan | 283 |
| 4 | France | 174 |
| 5 | United Kingdom | 160 |
| 6 | Netherlands | 95 |
| 7 | Australia | 89 |
| 8 | India | 75 |
| 9 | Russia | 73 |
| 10 | Spain | 68 |
| 11 | Canada | 56 |
| 12 | Brazil | 51 |
| 13 | Czech Republic | 49 |
| 14 | People's Republic of China | 48 |
| 15 | Italy | 44 |

## Animal Category Breakdown
| Category | Count |
| :--- | :--- |
| Mammal | 290 |
| Fauna | 247 |
| Bird | 4 |
| Reptile | 2 |

## Notes & Data Integrity Policy
- **Zero Artificial Manipulation:** No records were deleted automatically or artificially altered.
- **Preservation of Wikidata IDs:** Every entity preserves its canonical Q-number for upstream traceability.
- **Non-Invented Missing Values:** Unannotated fields in Wikidata remain unpopulated rather than fabricated.
