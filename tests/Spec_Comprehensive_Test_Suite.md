# GroundTruth DataHub — Comprehensive Test Suite Specification

**Version:** 1.0
**Date:** March 22, 2026
**Status:** Planning Document

---

## 1. Overview

This document defines the authoritative test suite for the GroundTruth DataHub platform. It covers every adapter, route, service, and integration point in the system.

### System Dimensions

| Component | Count |
|-----------|-------|
| Backend adapters | 79 |
| Layer configurations | 71 |
| Route files | 23 |
| Service modules | 29 |
| What's Here adapters | 18 |

### Prerequisites

- Running backend on `:3001` (`npm run dev` from `/backend`)
- PostgreSQL 15+ with PostGIS 3.3+ available
- `ANTHROPIC_API_KEY` environment variable set (required for narrative generation tests)
- Node.js 20+
- Network access to federal APIs (FEMA, USGS, EPA, etc.)

### Total Test Count

| Suite | Tests |
|-------|-------|
| T1 Smoke | 50 |
| T2 Regression | ~150 |
| T3 Full | ~375 |

---

## 2. Testing Philosophy

These seven rules govern all test execution. Every agent must internalize them before running a single test.

1. **Use multiple agents. Don't skimp.** Five agents running in parallel catch more issues than one agent running serially. Cross-domain bugs hide at boundaries — only parallel agents find them.

2. **Take your time. A proper full-suite run takes 8+ hours.** Rushing produces false confidence. If a T3 run finishes in 2 hours, you skipped something. Slow down, read responses, and think about what you're seeing.

3. **Test with different random locations every time.** Federal APIs return different data for different coordinates. Hardcoded locations create blind spots. Use the canonical locations for known-answer tests, but always add randomized points.

4. **Actually look at the responses — don't just check `success:true`.** A response can return `success:true` with empty data, wrong data, stale data, or malformed data. Read the actual fields. Compare against known answers. Question anything that looks off.

5. **Test the unhappy path as hard as the happy path.** Invalid coordinates, missing parameters, SQL injection, oversized polygons, nonexistent layer names — these must all return clean 400 errors, never 500s, never stack traces, never hangs.

6. **When something looks weird, dig deeper.** If a count says 71 but you only see 10 items, that's a bug. If a response includes `"null"` as a string, that's a bug. If timing spikes from 2s to 25s, that's worth investigating. Don't shrug it off.

7. **The MCP layer is its own system — test it separately from REST API.** MCP tools wrap REST endpoints but add their own parsing, parameter mapping, and error handling. A working REST endpoint can have a broken MCP tool. Test both independently.

---

## 3. Execution Model

Three tiers of testing, each with a different scope and trigger.

| Tier | Name | Tests | Time | Trigger |
|------|------|-------|------|---------|
| T1 | Smoke | 50 | 10 min | Every deploy and every PR |
| T2 | Regression | ~150 | 2 hr | Nightly automated run |
| T3 | Full | ~375 | 8 hr | Weekly or before any major release |

### Tier Relationships

- **T1** is a strict subset of T2, which is a strict subset of T3.
- T1 must pass before a PR can merge. No exceptions.
- T2 failures send an alert to the team channel. Investigation begins next business day.
- T3 failures open a tracking ticket. Known failures tagged XFAIL are exempt from alerts.

### Pass/Fail Criteria

- **T1 Pass:** All 50 tests green, no 500 errors, total runtime < 15 min.
- **T2 Pass:** >= 95% green (excluding XFAIL), no new regressions vs. previous run.
- **T3 Pass:** >= 90% green (excluding XFAIL), all known-answer validations correct, performance benchmarks within tolerance.

---

## 4. Agent Assignment

Five agents run in parallel, each owning a specific domain. No test belongs to more than one agent.

| Agent | Domain | Scope | ~Tests |
|-------|--------|-------|--------|
| **A** | Core Infrastructure | health, layers, spatial/*, geocode, query-address, middleware, security | ~70 |
| **B** | Water & Hydrology | FEMA, NRCS, DEM, NWI, 3DHP, ATTAINS, WBD, Atlas14, rainfall/*, hydrology/*, cn/*, stations/*, water-quality/*, watershed/*, gage-intelligence/* | ~75 |
| **C** | Environment & Contamination | geology, superfund, brownfields, UST, NPDES, ECHO, NLCD, critical habitat, PAD-US, GBIF, fish habitat, cropland, EPA-*, BLM, NPS, groundwater, SSA | ~70 |
| **D** | Infrastructure + Hazards + Energy | HIFLD (6 subtypes), NRI, seismic, wildfires, landslides, coastal, SVI, NREL, DOT bridges, FAA airports, NPS historic, SLR, census, Microsoft buildings | ~75 |
| **E** | What's Here + Reports + Performance | assembleDataPacket, narrative generation, export, constraints reports, site analysis, performance benchmarks, randomized locations | ~70 |

### Agent Communication Protocol

- Each agent logs results to a structured JSON file: `test-results-agent-{A|B|C|D|E}.json`
- Results are merged into a single `test-report.json` after all agents complete.
- If Agent X discovers a cross-domain issue (e.g., Agent B finds a spatial route bug), it logs the finding and tags it for Agent A review.

---

## 5. Reference Locations

### 5.1 Canonical Known-Answer Locations

These locations have verified ground-truth data. Use them for deterministic assertions.

| ID | Name | Lat | Lng | Known Facts |
|----|------|-----|-----|-------------|
| LOC-1 | Atlanta, GA | 33.749 | -84.388 | Zone X, urban soil, Piedmont geology, non-SFHA |
| LOC-2 | Charleston, SC | 32.776 | -79.931 | Zone AE/VE, coastal, wetlands present, tidal influence |
| LOC-3 | Las Vegas, NV | 36.169 | -115.140 | BLM lands nearby, arid climate, minimal flood risk |
| LOC-4 | Houston, TX | 29.760 | -95.370 | Zone AE, superfund sites nearby, high rainfall (Atlas14 > 10in/24hr) |
| LOC-5 | Yellowstone, WY | 44.428 | -110.589 | NPS boundary, critical habitat, seismic activity, protected land |
| LOC-6 | Miami, FL | 25.761 | -80.192 | Coastal flood zone, sea level rise exposure, sole source aquifer (Biscayne) |
| LOC-7 | Des Moines, IA | 41.587 | -93.625 | Cropland dominant, hydric soils, agricultural land use |
| LOC-8 | Seattle, WA | 47.606 | -122.332 | Seismic design category D, landslide susceptibility, high precipitation |

### 5.2 Edge-Case Locations

These locations test boundary conditions and graceful degradation.

| ID | Name | Lat | Lng | Purpose |
|----|------|-----|-----|---------|
| EDGE-1 | Gulf of Mexico (ocean) | 28.000 | -89.000 | No land data — should return gracefully, not crash |
| EDGE-2 | Interior Alaska | 64.200 | -152.500 | Outside CONUS — many adapters have no coverage |
| EDGE-3 | Hawaii (Big Island) | 19.897 | -155.583 | Island territory — partial adapter coverage |
| EDGE-4 | US/Canada Border | 49.000 | -123.000 | Boundary condition — some adapters clip at border |

### 5.3 Gage References

| ID | USGS Site Number | Description | Purpose |
|----|------------------|-------------|---------|
| GAGE-1 | 02336000 | Chattahoochee River near Atlanta, GA | Known active gage, rich historical data |
| GAGE-2 | 08158000 | Colorado River at Austin, TX | Known active gage, different region |
| GAGE-3 | 99999999 | Invalid site number | Error handling — should return clean error |

---

## 6. Known Bugs & XFAIL Registry

### 6.1 Known Bugs

These bugs are documented and expected to cause test failures. Tests that hit these bugs are marked XFAIL (expected failure) and do not count against pass rates.

| ID | Component | Description | Affected Tests |
|----|-----------|-------------|----------------|
| BUG-001 | estimate_ungaged | Parameter mapping broken — DRNAREA not mapped to drainage area input | WF-2 steps |
| BUG-002 | estimate_ungaged | `required_parameters` endpoint returns 404 | WF-2 steps |
| BUG-003 | estimate_ungaged | `nss_regions` returns all regions globally instead of filtering to location | WF-2 steps |
| BUG-004 | list_layers | Claims 71 layers in metadata but only returns 10 in response body | SMOKE-004 variant |
| DOC-001 | historic_places | Description promises fields (architect, style, significance) not present in actual response | Agent D NPS historic tests |
| DOC-002 | discover_tools | Uses REST endpoint names instead of MCP tool names in documentation | MCP discovery tests |
| DOC-003 | Tool counts | Three conflicting counts in docs: 107 tools, 30 tools, 18 tools | Documentation audit |
| DOC-004 | check_status | Reports 13 connected APIs; llms.txt claims 37 data sources | Status endpoint tests |
| DOC-005 | bbox guidance | No documentation on maximum bbox size before timeout/rejection | Spatial bbox tests |
| DOC-006 | Error messages | Error responses use wrong context templates (e.g., MCP errors reference REST patterns) | Error handling tests |

### 6.2 XFAIL: API-Key-Dependent Adapters

These adapters require external API keys that may not be configured in all environments. Tests are marked XFAIL when the key is absent.

| Adapter | Required Key | XFAIL Condition |
|---------|-------------|-----------------|
| AirNow | `AIRNOW_API_KEY` | Key not set in environment |
| NASA FIRMS | `NASA_FIRMS_API_KEY` | Key not set in environment |
| NASS | `NASS_API_KEY` | Key not set in environment |
| FCC Broadband | `FCC_API_KEY` | Key not set in environment |
| NOAA CDO | `NOAA_CDO_TOKEN` | Key not set in environment |

---

## 7. Universal Validation Checks

These checks apply to **every** test response unless explicitly exempted. Each test runner must enforce these automatically.

| ID | Check | Applies To |
|----|-------|-----------|
| U1 | Response has `success` field set to `true` or contains a meaningful error object | All API responses |
| U2 | Response has `_summary` field with human-readable text | All data-returning endpoints |
| U3 | Response has source attribution (source name and/or URL) | All adapter responses |
| U4 | No HTTP 500 errors — all failures must be 4xx with descriptive message | All endpoints |
| U5 | Response time < 30 seconds (unless endpoint is documented as async) | All endpoints |
| U6 | All fields documented in the endpoint's schema are present in response | All endpoints |
| U7 | Field types match documentation (string is string, number is number, boolean is boolean) | All endpoints |
| U8 | No string `"null"` or `"undefined"` appearing as data values | All responses |
| U9 | GeoJSON features have valid geometry with numeric coordinates in valid ranges | All GeoJSON responses |
| U10 | Metadata counts are internally consistent (e.g., `totalFeatures` matches `features.length`) | All counted responses |

### Enforcement

- Universal checks are run as a post-processing step on every test response.
- A universal check failure is logged as a separate finding tagged with the check ID.
- U4 failures are always blocking (a 500 error is never acceptable).
- U8 failures are warnings on T1, blocking on T2+.

---

## 8. T1 Smoke Suite (50 Tests)

The smoke suite validates that the system is fundamentally operational. Every test must pass for a PR to merge.

### 8.1 Health & Connectivity (8 tests)

| ID | Test | Method | Endpoint | Expected |
|----|------|--------|----------|----------|
| SMOKE-001 | Health check v0 | GET | `/api/health` | 200 OK |
| SMOKE-002 | Health check v1 | GET | `/api/v1/health` | 200 OK |
| SMOKE-003 | API docs listing | GET | `/api/v1/docs` | 200, body contains endpoint descriptions |
| SMOKE-004 | Layer listing | GET | `/api/v1/layers` | 200, array with >= 30 layers |
| SMOKE-005 | Health response time | GET | `/api/health` | Response within 500ms |
| SMOKE-006 | Frontend static files | GET | `/` | 200, HTML content |
| SMOKE-007 | API status check | GET | `/api/v1/status` | 200, `connected` count > 0 |
| SMOKE-008 | Rate limit headers | GET | `/api/health` | Headers include `X-RateLimit-*` or similar |

### 8.2 Core Spatial with Known Answers (10 tests)

| ID | Test | Method | Endpoint | Location | Expected |
|----|------|--------|----------|----------|----------|
| SMOKE-009 | Flood zone at Atlanta | GET | `/api/v1/spatial/point` | LOC-1 | `flood_zones` present, zone field exists |
| SMOKE-010 | Soil at Atlanta | GET | `/api/v1/spatial/point` | LOC-1 | `soil_map_units` present with data |
| SMOKE-011 | Elevation at Atlanta | GET | `/api/v1/spatial/point` | LOC-1 | Elevation value returned (numeric, reasonable range) |
| SMOKE-012 | Flood zone at Miami | GET | `/api/v1/spatial/point` | LOC-6 | SFHA flood zone (AE or VE) |
| SMOKE-013 | Spatial summary | POST | `/api/v1/spatial/summary` | LOC-1 | Counts for >= 5 layers returned |
| SMOKE-014 | Spatial near query | GET | `/api/v1/spatial/near` | LOC-1 | Features within radius returned |
| SMOKE-015 | Spatial bbox query | GET | `/api/v1/spatial/bbox` | LOC-1 area | Valid FeatureCollection |
| SMOKE-016 | Geocode known address | GET | `/api/v1/geocode` | "1600 Pennsylvania Ave" | lat ~38.8, lng ~-77.0 |
| SMOKE-017 | Query-address composite | GET | `/api/v1/query-address` | "Atlanta, GA" | Location + associated data layers |
| SMOKE-018 | Geometry suppression | GET | `/api/v1/spatial/point` | LOC-1, `geometry=none` | Response strips coordinate geometry |

### 8.3 Adapter Ping Tests (12 tests)

Each ping test hits the adapter's upstream API with minimal parameters and verifies a non-error response.

| ID | Test | Adapter | Location | Expected |
|----|------|---------|----------|----------|
| SMOKE-019 | FEMA ping | fema | LOC-4 | 200, features array |
| SMOKE-020 | NRCS ping | nrcs | LOC-1 | 200, soil data |
| SMOKE-021 | DEM ping | dem | LOC-1 | 200, elevation value |
| SMOKE-022 | NWI ping | nwi | LOC-2 | 200, wetland features |
| SMOKE-023 | 3DHP ping | 3dhp | LOC-1 | 200, hydrography data |
| SMOKE-024 | ATTAINS ping | attains | LOC-4 | 200, impairment data |
| SMOKE-025 | NLCD ping | nlcd | LOC-1 | 200, land cover class |
| SMOKE-026 | Superfund ping | superfund | LOC-4 | 200, site data |
| SMOKE-027 | Brownfields ping | brownfields | LOC-4 | 200, response body |
| SMOKE-028 | UST ping | ust | LOC-1 | 200, tank data |
| SMOKE-029 | Critical Habitat ping | critical-habitat | LOC-5 | 200, species data |
| SMOKE-030 | PAD-US ping | padus | LOC-5 | 200, protected area data |

### 8.4 What's Here Smoke (6 tests)

| ID | Test | Method | Endpoint | Location | Expected |
|----|------|--------|----------|----------|----------|
| SMOKE-031 | What's Here returns flood risk | GET | `/api/whats-here` | LOC-4 | Response contains `flood_risk` category |
| SMOKE-032 | Sources queried count | GET | `/api/whats-here` | LOC-1 | `sources_queried` = 10 (or documented count) |
| SMOKE-033 | Sources with data | GET | `/api/whats-here` | LOC-1 | `sources_with_data` >= 3 |
| SMOKE-034 | Response time | GET | `/api/whats-here` | LOC-1 | < 15 seconds |
| SMOKE-035 | Narrative endpoint | GET | `/api/whats-here/narrative` | LOC-1 | 200 OK |
| SMOKE-036 | Narrative with area | POST | `/api/whats-here/narrative` | LOC-1, `areaAcres: 5` | 200, narrative text returned |

### 8.5 Input Validation (8 tests)

| ID | Test | Method | Endpoint | Input | Expected |
|----|------|--------|----------|-------|----------|
| SMOKE-037 | Invalid latitude | GET | `/api/v1/spatial/point` | `lat=999` | 400 Bad Request |
| SMOKE-038 | Missing required params | GET | `/api/v1/spatial/point` | No lat/lng | 400 Bad Request |
| SMOKE-039 | SQL injection attempt | GET | `/api/v1/spatial/point` | `lat=33.749; DROP TABLE--` | 400, not 500 |
| SMOKE-040 | XSS in layer name | GET | `/api/v1/spatial/point` | `layers=<script>alert(1)</script>` | 400, not 500 |
| SMOKE-041 | Oversized polygon | POST | `/api/v1/spatial/polygon` | Polygon with 50,000+ vertices | 400 or timeout, not crash |
| SMOKE-042 | Invalid GeoJSON | POST | `/api/v1/spatial/polygon` | `{"type":"invalid"}` | 400, descriptive error |
| SMOKE-043 | Unknown layer name | GET | `/api/v1/spatial/point` | `layers=nonexistent_layer` | Error response, not crash |
| SMOKE-044 | Non-US geocode | GET | `/api/v1/geocode` | `address=Paris, France` | Empty results or out-of-bounds message, not crash |

### 8.6 Output Validation (6 tests)

| ID | Test | Method | Endpoint | Expected |
|----|------|--------|----------|----------|
| SMOKE-045 | Export returns job ID | POST | `/api/v1/export` | `jobId` field in response |
| SMOKE-046 | Export status | GET | `/api/v1/export/:jobId` | Valid status object (pending/complete/error) |
| SMOKE-047 | Site analysis structure | POST | `/api/v1/site-analysis` | Report structure with sections |
| SMOKE-048 | Site developability score | POST | `/api/v1/site-developability` | Score between 0 and 100 |
| SMOKE-049 | What's Here at ocean | GET | `/api/whats-here` | EDGE-1 coords: graceful response, no crash |
| SMOKE-050 | What's Here at Alaska | GET | `/api/whats-here` | EDGE-2 coords: response returned, no crash |

---

## 9. Adapter-Level Tests (~160 tests)

Each adapter gets: (1) a ping test verifying connectivity, (2) a data fetch with known-answer location, and (3) schema validation of the response structure.

### 9.1 Agent B — Water & Hydrology (~35 tests)

#### FEMA Flood (3 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-001 | FEMA ping | LOC-4 | 200 response, features array |
| ADAPT-B-002 | FEMA known answer at Houston | LOC-4 | Zone AE present in results |
| ADAPT-B-003 | FEMA schema validation | LOC-1 | Fields: floodZone, zoneSubtype, sfha, panelNumber |

#### NRCS Soils (3 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-004 | NRCS ping | LOC-1 | 200, soil data returned |
| ADAPT-B-005 | NRCS known answer at Des Moines | LOC-7 | Hydric soils present |
| ADAPT-B-006 | NRCS schema | LOC-1 | Fields: muname, musym, hydgrp, drainagecl |

#### DEM Elevation (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-007 | DEM ping | LOC-1 | Numeric elevation returned |
| ADAPT-B-008 | DEM known answer at Denver-ish | LOC-3 | Elevation reasonable for location |

#### NWI Wetlands (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-009 | NWI ping | LOC-2 | 200, wetland features |
| ADAPT-B-010 | NWI known answer at Charleston | LOC-2 | Wetland types present (estuarine/palustrine) |

#### 3DHP Hydrography (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-011 | 3DHP ping | LOC-1 | 200, waterbody/stream features |
| ADAPT-B-012 | 3DHP schema | LOC-1 | Fields: featureName, featureType, reachCode |

#### ATTAINS Water Quality (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-013 | ATTAINS ping | LOC-4 | 200, impairment data |
| ADAPT-B-014 | ATTAINS known answer at Houston | LOC-4 | Impaired waterbodies present |

#### WBD Watershed Boundaries (3 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-015 | WBD ping | LOC-1 | 200, HUC boundary returned |
| ADAPT-B-016 | WBD known answer at Atlanta | LOC-1 | HUC-8 or HUC-12 code matches known value |
| ADAPT-B-017 | WBD schema | LOC-1 | Fields: huc, name, areaAcres, states |

#### Atlas14 Rainfall (3 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-018 | Atlas14 ping | LOC-4 | 200, rainfall data |
| ADAPT-B-019 | Atlas14 known answer at Houston | LOC-4 | 24hr/100yr > 10 inches |
| ADAPT-B-020 | Atlas14 schema | LOC-1 | Fields: duration, frequency, depth, units |

#### NOAA Tidal Data (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-021 | NOAA tide ping | LOC-2 | 200, station data |
| ADAPT-B-022 | NOAA tide at Charleston | LOC-2 | Tide station within range |

#### USGS Stream Gages (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-023 | USGS gage ping | GAGE-1 | 200, gage data |
| ADAPT-B-024 | USGS gage known answer | GAGE-1 | Site name contains "Chattahoochee" |

#### StreamStats (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-025 | StreamStats ping | LOC-1 | 200, basin data |
| ADAPT-B-026 | StreamStats delineation | LOC-1 | Watershed polygon returned |

#### Rainfall Service (3 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-027 | Rainfall IDF fetch | LOC-4 | IDF data with multiple durations |
| ADAPT-B-028 | Rainfall hyetograph | LOC-4 | Time-series array returned |
| ADAPT-B-029 | Rainfall missing location | null | 400 error, not crash |

#### Curve Number Service (3 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-030 | CN lookup at Atlanta | LOC-1 | CN value between 30-98 |
| ADAPT-B-031 | CN analyze with polygon | LOC-1 area | Weighted CN returned |
| ADAPT-B-032 | CN schema | LOC-1 | Fields: cn, hsg, landcover, source |

#### Hydrology Service (3 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-B-033 | Hydrology analyze | LOC-1 | Peak flow estimates returned |
| ADAPT-B-034 | Hydrology with watershed | LOC-1 | Basin characteristics included |
| ADAPT-B-035 | Hydrology invalid location | EDGE-1 | Graceful error for ocean point |

### 9.2 Agent C — Environment & Contamination (~45 tests)

#### NLCD Land Cover (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-001 | NLCD ping | LOC-1 | Land cover class returned |
| ADAPT-C-002 | NLCD known answer at Des Moines | LOC-7 | Cropland classification (81/82) |

#### Geology (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-003 | Geology ping | LOC-1 | Rock type / formation data |
| ADAPT-C-004 | Geology known answer at Atlanta | LOC-1 | Piedmont geology indicated |

#### Groundwater (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-005 | Groundwater ping | LOC-6 | Aquifer data returned |
| ADAPT-C-006 | Groundwater known answer at Miami | LOC-6 | Biscayne Aquifer or Sole Source Aquifer flagged |

#### Critical Habitat (3 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-007 | Critical Habitat ping | LOC-5 | 200, species habitat data |
| ADAPT-C-008 | Critical Habitat at Yellowstone | LOC-5 | Protected species habitats present |
| ADAPT-C-009 | Critical Habitat schema | LOC-5 | Fields: species, status, area, listingDate |

#### PAD-US Protected Areas (3 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-010 | PAD-US ping | LOC-5 | 200, protected area data |
| ADAPT-C-011 | PAD-US at Yellowstone | LOC-5 | National Park designation present |
| ADAPT-C-012 | PAD-US schema | LOC-5 | Fields: unitName, designation, ownerType, gapStatus |

#### Brownfields (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-013 | Brownfields ping | LOC-4 | 200, site data |
| ADAPT-C-014 | Brownfields at Houston | LOC-4 | Sites returned within radius |

#### Superfund (3 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-015 | Superfund ping | LOC-4 | 200, NPL site data |
| ADAPT-C-016 | Superfund at Houston | LOC-4 | NPL sites present |
| ADAPT-C-017 | Superfund schema | LOC-4 | Fields: siteName, epaId, nplStatus, city, state |

#### UST Underground Storage Tanks (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-018 | UST ping | LOC-1 | 200, tank data |
| ADAPT-C-019 | UST schema | LOC-1 | Fields: facilityName, tankCount, substance, status |

#### NPDES Outfalls (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-020 | NPDES ping | LOC-4 | 200, permit data |
| ADAPT-C-021 | NPDES at Houston | LOC-4 | Discharge permits present |

#### ECHO Enforcement (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-022 | ECHO ping | LOC-4 | 200, facility data |
| ADAPT-C-023 | ECHO schema | LOC-4 | Fields: facilityName, violations, inspections |

#### Sole Source Aquifer (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-024 | SSA ping | LOC-6 | 200, aquifer data |
| ADAPT-C-025 | SSA at Miami | LOC-6 | Biscayne Aquifer identified |

#### BLM Public Lands (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-026 | BLM ping | LOC-3 | 200, land data |
| ADAPT-C-027 | BLM at Las Vegas | LOC-3 | BLM-managed lands present |

#### NPS National Parks (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-028 | NPS ping | LOC-5 | 200, park data |
| ADAPT-C-029 | NPS at Yellowstone | LOC-5 | Yellowstone NP identified |

#### GBIF Biodiversity (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-030 | GBIF ping | LOC-5 | 200, species observations |
| ADAPT-C-031 | GBIF at Yellowstone | LOC-5 | Species records present |

#### Fish Habitat (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-032 | Fish Habitat ping | LOC-1 | 200, habitat data |
| ADAPT-C-033 | Fish Habitat schema | LOC-1 | Fields: species, habitatType, condition |

#### Cropland (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-034 | Cropland ping | LOC-7 | 200, crop data |
| ADAPT-C-035 | Cropland at Des Moines | LOC-7 | Corn/soybean classification |

#### WQP Water Quality Portal (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-036 | WQP ping | LOC-1 | 200, monitoring data |
| ADAPT-C-037 | WQP schema | LOC-1 | Fields: stationId, parameter, value, date |

#### EPA Suite: SDWIS, RCRA, GHG, FRS (4 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-038 | EPA-SDWIS ping | LOC-1 | 200, drinking water system data |
| ADAPT-C-039 | EPA-RCRA ping | LOC-4 | 200, hazardous waste data |
| ADAPT-C-040 | EPA-GHG ping | LOC-4 | 200, emissions data |
| ADAPT-C-041 | EPA-FRS ping | LOC-1 | 200, facility registry data |

#### AirNow (1 test — XFAIL)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-C-042 | AirNow ping | LOC-1 | XFAIL if `AIRNOW_API_KEY` not set; otherwise 200, AQI data |

### 9.3 Agent D — Infrastructure, Hazards, Energy (~50 tests)

#### HIFLD x6 Subtypes (12 tests)
| ID | Test | Subtype | Location | Validation |
|----|------|---------|----------|------------|
| ADAPT-D-001 | HIFLD Hospitals ping | hifld-hospitals | LOC-1 | 200, hospital features |
| ADAPT-D-002 | HIFLD Hospitals at Atlanta | hifld-hospitals | LOC-1 | Hospital names present |
| ADAPT-D-003 | HIFLD Schools ping | hifld-schools | LOC-1 | 200, school features |
| ADAPT-D-004 | HIFLD Schools at Atlanta | hifld-schools | LOC-1 | Schools within radius |
| ADAPT-D-005 | HIFLD Fire Stations ping | hifld-fire-stations | LOC-1 | 200, station features |
| ADAPT-D-006 | HIFLD Fire Stations at Atlanta | hifld-fire-stations | LOC-1 | Fire stations present |
| ADAPT-D-007 | HIFLD EMS ping | hifld-ems | LOC-1 | 200, EMS features |
| ADAPT-D-008 | HIFLD EMS at Atlanta | hifld-ems | LOC-1 | EMS stations present |
| ADAPT-D-009 | HIFLD Law Enforcement ping | hifld-law-enforcement | LOC-1 | 200, LE features |
| ADAPT-D-010 | HIFLD Law Enforcement at Atlanta | hifld-law-enforcement | LOC-1 | LE facilities present |
| ADAPT-D-011 | HIFLD Power Plants ping | hifld-power-plants | LOC-4 | 200, plant features |
| ADAPT-D-012 | HIFLD Power Plants at Houston | hifld-power-plants | LOC-4 | Power plants present |

#### NRI Natural Risk Index (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-013 | NRI ping | LOC-4 | 200, risk data |
| ADAPT-D-014 | NRI at Houston | LOC-4 | Risk rating fields present |

#### NFIP Claims (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-015 | NFIP ping | LOC-4 | 200, claims data |
| ADAPT-D-016 | NFIP at Houston | LOC-4 | Claims data present (high-flood area) |

#### Seismic Design (3 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-017 | Seismic ping | LOC-8 | 200, seismic data |
| ADAPT-D-018 | Seismic at Seattle | LOC-8 | Design category D or higher |
| ADAPT-D-019 | Seismic schema | LOC-8 | Fields: sds, sd1, siteClass, designCategory |

#### CDC Social Vulnerability Index (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-020 | SVI ping | LOC-4 | 200, vulnerability data |
| ADAPT-D-021 | SVI schema | LOC-4 | Fields: overallScore, themes, percentile |

#### Landslides (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-022 | Landslides ping | LOC-8 | 200, susceptibility data |
| ADAPT-D-023 | Landslides at Seattle | LOC-8 | Susceptibility data present |

#### Coastal Vulnerability (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-024 | Coastal ping | LOC-2 | 200, coastal data |
| ADAPT-D-025 | Coastal at Charleston | LOC-2 | Vulnerability index present |

#### Wildfire Perimeters (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-026 | Wildfire ping | LOC-3 | 200, fire perimeter data |
| ADAPT-D-027 | Wildfire schema | LOC-3 | Fields: fireName, acres, year, cause |

#### NREL Solar (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-028 | NREL Solar ping | LOC-3 | 200, solar resource data |
| ADAPT-D-029 | NREL Solar at Las Vegas | LOC-3 | High GHI value (arid/sunny) |

#### NREL PVWatts (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-030 | PVWatts ping | LOC-3 | 200, PV output data |
| ADAPT-D-031 | PVWatts schema | LOC-3 | Fields: acAnnual, solradAnnual, capacity |

#### NREL Utility Rates (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-032 | Utility Rates ping | LOC-1 | 200, rate data |
| ADAPT-D-033 | Utility Rates schema | LOC-1 | Fields: utility, residential, commercial |

#### Alt Fuel Stations (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-034 | Alt Fuel ping | LOC-1 | 200, station data |
| ADAPT-D-035 | Alt Fuel schema | LOC-1 | Fields: stationName, fuelType, address |

#### EIA Electricity (1 test)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-036 | EIA ping | LOC-1 | 200, electricity data |

#### FAA Airports (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-037 | FAA Airports ping | LOC-1 | 200, airport features |
| ADAPT-D-038 | FAA Airports at Atlanta | LOC-1 | Hartsfield-Jackson in results |

#### FRA Railroads (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-039 | FRA Railroads ping | LOC-1 | 200, railroad features |
| ADAPT-D-040 | FRA Railroads schema | LOC-1 | Fields: rrOwner, trackType, subdivision |

#### DOT Bridges (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-041 | DOT Bridges ping | LOC-1 | 200, bridge data |
| ADAPT-D-042 | DOT Bridges schema | LOC-1 | Fields: structureNumber, condition, yearBuilt |

#### NPS Historic Places (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-043 | NPS Historic ping | LOC-1 | 200, historic site data |
| ADAPT-D-044 | NPS Historic at Atlanta | LOC-1 | Historic places present (NOTE: DOC-001 — some fields may be missing) |

#### USFS National Forests (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-045 | USFS Forests ping | LOC-5 | 200, forest boundary data |
| ADAPT-D-046 | USFS Forests schema | LOC-5 | Fields: forestName, region, area |

#### NOAA CORS (1 test)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-047 | NOAA CORS ping | LOC-1 | 200, CORS station data |

#### Sea Level Rise (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-048 | SLR ping | LOC-6 | 200, SLR projection data |
| ADAPT-D-049 | SLR at Miami | LOC-6 | Inundation data present |

#### Census (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-050 | Census ping | LOC-1 | 200, demographic data |
| ADAPT-D-051 | Census schema | LOC-1 | Fields: population, tract, blockGroup |

#### Microsoft Building Footprints (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| ADAPT-D-052 | Microsoft Buildings ping | LOC-1 | 200, building footprint data |
| ADAPT-D-053 | Microsoft Buildings at Atlanta | LOC-1 | Building polygons present |

---

## 10. HTTP-Level API Endpoint Tests (~80 tests)

These tests validate the REST API contract: correct HTTP methods, status codes, headers, query parameters, and response shapes.

### 10.1 Agent A — Core Routes (~40 tests)

#### Layers Endpoints (5 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-A-001 | List all layers | GET | `/api/v1/layers` | Array response, each has id, name, category |
| HTTP-A-002 | Layer by ID | GET | `/api/v1/layers/:id` | Single layer object with full config |
| HTTP-A-003 | Layer categories | GET | `/api/v1/layers?category=water` | Filtered subset |
| HTTP-A-004 | Invalid layer ID | GET | `/api/v1/layers/nonexistent` | 404 response |
| HTTP-A-005 | Layer count matches config | GET | `/api/v1/layers` | Count matches LAYER_DEFINITIONS length |

#### Spatial Point (5 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-A-006 | Point query basic | GET | `/api/v1/spatial/point?lat=33.749&lng=-84.388` | 200, data object |
| HTTP-A-007 | Point query with layers filter | GET | `/api/v1/spatial/point?lat=33.749&lng=-84.388&layers=flood_zones` | Only requested layer |
| HTTP-A-008 | Point query with radius | GET | `/api/v1/spatial/point?lat=33.749&lng=-84.388&radius=1000` | Features within radius |
| HTTP-A-009 | Point query boundary coordinates | GET | `/api/v1/spatial/point?lat=90&lng=180` | Handled gracefully |
| HTTP-A-010 | Point query negative test | GET | `/api/v1/spatial/point?lat=abc` | 400 with error message |

#### Spatial Near (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-A-011 | Near query basic | GET | `/api/v1/spatial/near` | 200, features with distances |
| HTTP-A-012 | Near query with limit | GET | `/api/v1/spatial/near?limit=5` | Max 5 features returned |
| HTTP-A-013 | Near query sort order | GET | `/api/v1/spatial/near` | Features sorted by distance ascending |

#### Spatial Bbox (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-A-014 | Bbox query basic | GET | `/api/v1/spatial/bbox` | 200, FeatureCollection |
| HTTP-A-015 | Bbox too large | GET | `/api/v1/spatial/bbox` | Error or warning for oversized bbox |
| HTTP-A-016 | Bbox inverted coordinates | GET | `/api/v1/spatial/bbox?minLng>maxLng` | 400 or auto-correction |

#### Spatial Polygon (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-A-017 | Polygon query basic | POST | `/api/v1/spatial/polygon` | 200, features within polygon |
| HTTP-A-018 | Polygon self-intersecting | POST | `/api/v1/spatial/polygon` | 400 or corrected |
| HTTP-A-019 | Polygon empty | POST | `/api/v1/spatial/polygon` | 400, descriptive error |

#### Spatial Summary (2 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-A-020 | Summary basic | POST | `/api/v1/spatial/summary` | 200, counts per layer |
| HTTP-A-021 | Summary with filter | POST | `/api/v1/spatial/summary` | Only specified layers counted |

#### Geocode (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-A-022 | Geocode address | GET | `/api/v1/geocode?address=Atlanta,GA` | lat/lng returned |
| HTTP-A-023 | Geocode empty string | GET | `/api/v1/geocode?address=` | 400 or empty results |
| HTTP-A-024 | Geocode special characters | GET | `/api/v1/geocode?address=123 O'Brien St` | Handled without error |

#### Query Address (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-A-025 | Query address composite | GET | `/api/v1/query-address` | Location + layer data |
| HTTP-A-026 | Query address with layers | GET | `/api/v1/query-address?layers=flood_zones,soils` | Only requested layers |
| HTTP-A-027 | Query address invalid | GET | `/api/v1/query-address?address=xyznotreal` | Graceful empty or error |

#### API Key Authentication (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-A-028 | Request without API key | GET | Protected endpoint | 401 or 403 |
| HTTP-A-029 | Request with valid API key | GET | Protected endpoint | 200 |
| HTTP-A-030 | Request with invalid API key | GET | Protected endpoint | 401 or 403 |

#### Status Endpoint (2 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-A-031 | Status overview | GET | `/api/v1/status` | Connected count, adapter statuses |
| HTTP-A-032 | Status response shape | GET | `/api/v1/status` | Each adapter has name, status, latency |

#### Middleware (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-A-033 | CORS headers on OPTIONS | OPTIONS | `/api/v1/health` | Access-Control-Allow-Origin present |
| HTTP-A-034 | JSON content type | GET | `/api/v1/health` | Content-Type: application/json |
| HTTP-A-035 | 404 for unknown route | GET | `/api/v1/nonexistent` | 404, JSON error body |

#### Error Responses (5 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-A-036 | Malformed JSON body | POST | `/api/v1/spatial/polygon` | 400, parse error |
| HTTP-A-037 | Wrong HTTP method | POST | `/api/v1/health` | 404 or 405 |
| HTTP-A-038 | Empty body on POST | POST | `/api/v1/spatial/polygon` | 400, descriptive error |
| HTTP-A-039 | Exceeds body size limit | POST | `/api/v1/spatial/polygon` | 413 or 400 |
| HTTP-A-040 | Concurrent rapid requests | GET x20 | `/api/v1/health` | No crashes, rate limit or 200 |

### 10.2 Agent B — Hydrology Routes (~25 tests)

#### Rainfall / Atlas14 (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-B-001 | Atlas14 fetch | GET | `/api/v1/rainfall/atlas14` | IDF data with durations |
| HTTP-B-002 | Atlas14 invalid coords | GET | `/api/v1/rainfall/atlas14?lat=999` | 400 |
| HTTP-B-003 | Atlas14 ocean point | GET | `/api/v1/rainfall/atlas14` | EDGE-1: graceful empty |

#### Rainfall Hyetograph (2 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-B-004 | Hyetograph generation | POST | `/api/v1/rainfall/hyetograph` | Time-series array |
| HTTP-B-005 | Hyetograph missing params | POST | `/api/v1/rainfall/hyetograph` | 400 |

#### CN Lookup (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-B-006 | CN by point | GET | `/api/v1/cn/lookup` | CN value 30-98 |
| HTTP-B-007 | CN invalid point | GET | `/api/v1/cn/lookup?lat=0&lng=0` | Error or empty |
| HTTP-B-008 | CN ocean point | GET | `/api/v1/cn/lookup` | EDGE-1: no crash |

#### CN Analyze (2 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-B-009 | CN polygon analysis | POST | `/api/v1/cn/analyze` | Weighted CN + breakdown |
| HTTP-B-010 | CN analyze empty polygon | POST | `/api/v1/cn/analyze` | 400 |

#### Hydrology Analyze (2 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-B-011 | Hydrology analysis | POST | `/api/v1/hydrology/analyze` | Peak flow + return periods |
| HTTP-B-012 | Hydrology missing params | POST | `/api/v1/hydrology/analyze` | 400 |

#### Stations (4 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-B-013 | Find stations near point | GET | `/api/v1/stations` | Array of stations with distance |
| HTTP-B-014 | Station details by ID | GET | `/api/v1/stations/:id` | Full station record |
| HTTP-B-015 | Station invalid ID | GET | `/api/v1/stations/99999999` | 404 or empty |
| HTTP-B-016 | Stations with type filter | GET | `/api/v1/stations?type=streamflow` | Only matching type |

#### Water Quality (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-B-017 | WQ by point | GET | `/api/v1/water-quality` | Monitoring data returned |
| HTTP-B-018 | WQ with parameter filter | GET | `/api/v1/water-quality?parameter=pH` | Filtered results |
| HTTP-B-019 | WQ at dry location | GET | `/api/v1/water-quality` | LOC-3: empty or minimal |

#### Watershed (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-B-020 | Watershed delineation | POST | `/api/v1/watershed` | Polygon + characteristics |
| HTTP-B-021 | Watershed at ocean | POST | `/api/v1/watershed` | EDGE-1: error, not crash |
| HTTP-B-022 | Watershed area calculation | POST | `/api/v1/watershed` | Area in sq km or acres |

#### Gage Intelligence (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-B-023 | Gage intelligence by site | GET | `/api/v1/gage-intelligence/:siteId` | GAGE-1: flow stats + analysis |
| HTTP-B-024 | Gage intelligence invalid ID | GET | `/api/v1/gage-intelligence/99999999` | GAGE-3: error response |
| HTTP-B-025 | Gage intelligence schema | GET | `/api/v1/gage-intelligence/:siteId` | Fields: peakFlows, flowDuration, statistics |

### 10.3 Agent E — What's Here + Composite (~15 tests)

#### What's Here at 8 Locations (8 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| HTTP-E-001 | What's Here Atlanta | LOC-1 | Complete data packet, sources_queried correct |
| HTTP-E-002 | What's Here Charleston | LOC-2 | Coastal data present |
| HTTP-E-003 | What's Here Las Vegas | LOC-3 | BLM/arid data present |
| HTTP-E-004 | What's Here Houston | LOC-4 | Flood + contamination data present |
| HTTP-E-005 | What's Here Yellowstone | LOC-5 | Protected area + wildlife data |
| HTTP-E-006 | What's Here Miami | LOC-6 | SLR + coastal flood data |
| HTTP-E-007 | What's Here Des Moines | LOC-7 | Agricultural data present |
| HTTP-E-008 | What's Here Seattle | LOC-8 | Seismic + landslide data |

#### Narrative Generation (3 tests)
| ID | Test | Method | Path | Validation |
|----|------|--------|------|------------|
| HTTP-E-009 | Narrative from data packet | POST | `/api/whats-here/narrative` | Markdown text returned |
| HTTP-E-010 | Narrative with custom prompt | POST | `/api/whats-here/narrative` | Custom focus reflected |
| HTTP-E-011 | Narrative without API key | POST | `/api/whats-here/narrative` | Graceful error if ANTHROPIC_API_KEY missing |

#### Cache Behavior (2 tests)
| ID | Test | Location | Validation |
|----|------|----------|------------|
| HTTP-E-012 | Cache hit (same location twice) | LOC-1 | Second request faster |
| HTTP-E-013 | Cache miss (different location) | LOC-1 then LOC-8 | Both return valid data |

#### Concurrent Requests (2 tests)
| ID | Test | Method | Validation |
|----|------|--------|------------|
| HTTP-E-014 | 5 concurrent What's Here | GET x5 | All return valid data, no race conditions |
| HTTP-E-015 | Mixed concurrent endpoints | GET + POST | No cross-contamination of responses |

---

## 11. What's Here Deep Tests (~30 tests)

### 11.1 Data Packet Completeness (10 tests)

Each test validates that a specific category in the data packet is populated at an appropriate location.

| ID | Category | Location | Validation |
|----|----------|----------|------------|
| WH-001 | Flood Risk | LOC-4 (Houston) | flood_risk object present with zone, sfha, panel |
| WH-002 | Soil | LOC-7 (Des Moines) | soil object present with type, hydric rating |
| WH-003 | Elevation | LOC-8 (Seattle) | elevation numeric value present |
| WH-004 | Wetlands | LOC-2 (Charleston) | wetlands array with features |
| WH-005 | Protected Areas | LOC-5 (Yellowstone) | protected_areas with designation |
| WH-006 | Contamination | LOC-4 (Houston) | contamination sites array not empty |
| WH-007 | Water Features | LOC-1 (Atlanta) | nearby water features listed |
| WH-008 | Land Cover | LOC-7 (Des Moines) | NLCD classification present |
| WH-009 | Infrastructure | LOC-1 (Atlanta) | hospitals/schools/fire stations present |
| WH-010 | Hazards | LOC-8 (Seattle) | seismic or landslide data present |

### 11.2 Known-Answer Validation (10 tests)

| ID | Test | Location | Assertion |
|----|------|----------|-----------|
| WH-011 | Miami is SFHA | LOC-6 | `sfha === true` |
| WH-012 | Atlanta is not SFHA | LOC-1 | `sfha === false` (Zone X) |
| WH-013 | Houston high rainfall | LOC-4 | Atlas14 24hr/100yr > 10 inches |
| WH-014 | Yellowstone is protected | LOC-5 | Protected area designation = National Park |
| WH-015 | Metadata count accuracy | LOC-1 | `sources_queried` matches actual adapter count |
| WH-016 | No null strings | LOC-1 | No field contains the string `"null"` or `"undefined"` |
| WH-017 | Distance accuracy | LOC-1 | `distanceFt` to nearest feature is reasonable (> 0, < 500,000) |
| WH-018 | findNearest correctness | LOC-1 | Nearest hospital is closer than second-nearest |
| WH-019 | Des Moines is agricultural | LOC-7 | Cropland classification present |
| WH-020 | Seattle seismic category | LOC-8 | Seismic design category = D or higher |

### 11.3 Narrative Quality Gates (5 tests)

| ID | Test | Validation |
|----|------|------------|
| WH-021 | Valid markdown | Narrative parses as valid Markdown without errors |
| WH-022 | Structure | Narrative contains >= 3 bold headers (`**...**` or `## ...`) |
| WH-023 | Length | Narrative is 100-300 words (not too terse, not bloated) |
| WH-024 | Source citations | Narrative references data sources by name (FEMA, NRCS, etc.) |
| WH-025 | No raw JSON | Narrative does not contain raw JSON objects or array brackets |

### 11.4 Partial Failure Resilience (5 tests)

| ID | Test | Scenario | Validation |
|----|------|----------|------------|
| WH-026 | Single adapter failure | One upstream API returns 500 | Other categories still populated, error noted in metadata |
| WH-027 | All adapters fail | All upstream APIs unreachable | Graceful error response, no crash, no 500 |
| WH-028 | Timeout isolation | One adapter takes 30s+ | Other adapters return on time, slow one times out gracefully |
| WH-029 | Cache miss then hit | Clear cache, request twice | First populates cache, second is faster |
| WH-030 | Empty data location | EDGE-1 (ocean) | Response has sources_queried > 0, sources_with_data = 0, no crash |

---

## 12. Cross-Tool Workflow Tests (4 Workflows)

These workflows test end-to-end multi-step operations that span multiple endpoints and services.

### WF-1: Complete Site Assessment

A user geocodes an address, queries the point, delineates the watershed, gets flow statistics, fetches rainfall, computes curve number, and generates a report.

| Step | Action | Endpoint | Depends On | Validation |
|------|--------|----------|------------|------------|
| 1 | Geocode address | GET `/api/v1/geocode?address=Atlanta,GA` | — | lat/lng returned |
| 2 | Point query | GET `/api/v1/spatial/point?lat={}&lng={}` | Step 1 lat/lng | Multi-layer data |
| 3 | Delineate watershed | POST `/api/v1/watershed` | Step 1 lat/lng | Polygon + area |
| 4 | Flow statistics | GET `/api/v1/gage-intelligence/{nearestGage}` | Step 2 gage data | Peak flows |
| 5 | Fetch rainfall | GET `/api/v1/rainfall/atlas14?lat={}&lng={}` | Step 1 lat/lng | IDF data |
| 6 | Compute CN | POST `/api/v1/cn/analyze` | Step 3 polygon | Weighted CN |
| 7 | Generate report | POST `/api/v1/site-analysis` | Steps 2-6 data | Complete report |

**Pass criteria:** All 7 steps succeed, data flows correctly between steps, final report references upstream data.

### WF-2: Ungaged Flood Estimation (XFAIL — BUG-001, BUG-002, BUG-003)

| Step | Action | Endpoint | Depends On | Validation |
|------|--------|----------|------------|------------|
| 1 | Get NSS regions | GET `/api/v1/hydrology/nss-regions` | — | Regions for location (BUG-003: may return all) |
| 2 | Get required params | GET `/api/v1/hydrology/required-parameters` | Step 1 region | Parameter list (BUG-002: may 404) |
| 3 | Submit characteristics | POST `/api/v1/hydrology/analyze` | Step 2 params | Flood estimates (BUG-001: DRNAREA unmapped) |
| 4 | Flood frequency curve | GET `/api/v1/hydrology/flood-frequency` | Step 3 results | Frequency data |
| 5 | Find similar gages | GET `/api/v1/stations?similar=true` | Step 1 location | Comparable basins |
| 6 | Transfer statistics | POST `/api/v1/hydrology/transfer` | Steps 3+5 | Adjusted estimates |

**Status:** XFAIL. Document actual failures and compare against known bugs.

### WF-3: Water Quality + Permits Assessment

| Step | Action | Endpoint | Depends On | Validation |
|------|--------|----------|------------|------------|
| 1 | Query address | GET `/api/v1/query-address?address=Houston,TX` | — | Location + basic data |
| 2 | Find watershed | POST `/api/v1/watershed` | Step 1 lat/lng | Watershed boundary |
| 3 | Get impairments | GET `/api/v1/water-quality` | Step 1 lat/lng | ATTAINS impairment data |
| 4 | Find water features | GET `/api/v1/spatial/near?layers=3dhp` | Step 1 lat/lng | Nearby streams/rivers |
| 5 | Analyze permits | GET `/api/v1/spatial/near?layers=npdes` | Step 1 lat/lng | NPDES permits in area |

**Pass criteria:** All steps return data, impairments and permits are in the same watershed.

### WF-4: Infrastructure Vulnerability Assessment

| Step | Action | Endpoint | Depends On | Validation |
|------|--------|----------|------------|------------|
| 1 | Geocode location | GET `/api/v1/geocode?address=Miami,FL` | — | lat/lng |
| 2 | Find bridges | GET `/api/v1/spatial/near?layers=bridges` | Step 1 | Bridge data with condition |
| 3 | Find hospitals | GET `/api/v1/spatial/near?layers=hospitals` | Step 1 | Hospital facilities |
| 4 | Find schools | GET `/api/v1/spatial/near?layers=schools` | Step 1 | School facilities |
| 5 | Find historic places | GET `/api/v1/spatial/near?layers=historic_places` | Step 1 | Historic sites |
| 6 | Get SVI | GET `/api/v1/spatial/point?layers=svi` | Step 1 | Social vulnerability |

**Pass criteria:** Infrastructure found near Miami, SVI data present, all responses have valid coordinates.

---

## 13. Performance Benchmarks (10 tests)

All benchmarks run 3 times and take the median. Thresholds are P95 targets for production.

| ID | Test | Operation | Threshold | Location |
|----|------|-----------|-----------|----------|
| PERF-001 | Point query latency | Single point query, 1 layer | < 3 seconds | LOC-1 |
| PERF-002 | Spatial summary latency | Summary across all layers | < 10 seconds | LOC-1 |
| PERF-003 | What's Here packet | Full assembleDataPacket | < 15 seconds | LOC-1 |
| PERF-004 | Narrative generation | AI narrative from packet | < 25 seconds | LOC-1 |
| PERF-005 | Concurrent load | 10 simultaneous point queries | All < 15 seconds | Mixed LOCs |
| PERF-006 | Layer features | Single layer feature fetch | < 5 seconds | LOC-1 |
| PERF-007 | Export cycle | Export request → job complete | < 30 seconds | LOC-1 |
| PERF-008 | Geocode latency | Single geocode request | < 5 seconds | "Atlanta, GA" |
| PERF-009 | Adapter ping sweep | All 50 adapters pinged serially | < 60 seconds total | LOC-1 |
| PERF-010 | Memory stability | 100 sequential requests | No memory growth > 50MB | LOC-1 |

### Benchmark Reporting

Results are logged as:

```json
{
  "test_id": "PERF-001",
  "median_ms": 1842,
  "p95_ms": 2310,
  "threshold_ms": 3000,
  "pass": true,
  "runs": [1750, 1842, 2310]
}
```

---

## 14. Security Tests (15 tests)

### SQL Injection (5 tests)
| ID | Test | Vector | Validation |
|----|------|--------|------------|
| SEC-001 | SQL in lat param | `lat=33.749; DROP TABLE users--` | 400, not 500, no data leak |
| SEC-002 | SQL in address param | `address='; SELECT * FROM pg_tables--` | 400, no query execution |
| SEC-003 | SQL in layer name | `layers=flood_zones' OR '1'='1` | 400, no query execution |
| SEC-004 | SQL in bbox params | `minLat=33 UNION SELECT` | 400, no query execution |
| SEC-005 | SQL in header | `X-Custom: '; DROP TABLE--` | Ignored, no effect |

### XSS (3 tests)
| ID | Test | Vector | Validation |
|----|------|--------|------------|
| SEC-006 | XSS in query param | `address=<script>alert(1)</script>` | Sanitized in response |
| SEC-007 | XSS in layer name | `layers=<img onerror=alert(1)>` | 400 or sanitized |
| SEC-008 | XSS in POST body | GeoJSON with script tags in properties | Sanitized or rejected |

### Rate Limiting (2 tests)
| ID | Test | Method | Validation |
|----|------|--------|------------|
| SEC-009 | Burst 100 requests/sec | GET `/api/health` x100 rapid | Rate limit kicks in (429) |
| SEC-010 | Sustained high rate | 50 req/sec for 30 seconds | Server remains responsive |

### Path Traversal (2 tests)
| ID | Test | Vector | Validation |
|----|------|--------|------------|
| SEC-011 | Path traversal in URL | `/api/v1/../../../etc/passwd` | 400 or 404, no file content |
| SEC-012 | Path traversal in param | `file=../../../../etc/passwd` | 400, no file content |

### Other (3 tests)
| ID | Test | Vector | Validation |
|----|------|--------|------------|
| SEC-013 | Oversized request body | 10MB JSON POST | 413 or 400, no crash |
| SEC-014 | Missing Content-Type | POST without Content-Type header | 400 or handled gracefully |
| SEC-015 | CORS enforcement | Request from unauthorized origin | Appropriate CORS headers |

---

## 15. Randomized Location Protocol

For T3 (full) runs, supplement canonical locations with randomized points to discover coverage gaps and edge cases.

### Generation Method

```
For each T3 run:
  1. Generate random seed (log it for reproducibility)
  2. Create 10 random points within CONUS bounding box:
     - Lat: 24.396308 to 49.384358
     - Lng: -124.848974 to -66.885444
  3. Filter: discard points in ocean (use land/water check)
  4. For each valid point:
     a. Run What's Here data packet
     b. Run spatial/point with all layers
     c. Log results
```

### Validation Criteria (per random point)

| Check | Threshold |
|-------|-----------|
| No crash (HTTP 200 or 4xx, never 500) | Mandatory |
| `sources_queried` = expected count | Mandatory |
| `sources_with_data` >= 3 | Expected for CONUS |
| Response time < 30 seconds | Mandatory |
| No string "null" or "undefined" | Mandatory |
| GeoJSON coordinates valid | Mandatory |

### Reproducibility

- The random seed is logged at the start of each T3 run.
- Any failing random location is promoted to the Known Bugs table if it reveals a real bug.
- After promotion, the location is added to EDGE locations for deterministic regression testing.

---

## 16. CI/CD Integration

### Pipeline Configuration

```
┌─────────────────────────────────────────────────────────┐
│  PR Created / Push to Branch                            │
│                                                         │
│  ┌─────────────┐                                       │
│  │ T1 Smoke    │  10 min, blocks merge on failure      │
│  │ (50 tests)  │                                       │
│  └─────────────┘                                       │
│                                                         │
│  If T1 passes → PR is merge-eligible                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Nightly (2:00 AM UTC)                                  │
│                                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ Ag A │ │ Ag B │ │ Ag C │ │ Ag D │ │ Ag E │        │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│     ↓        ↓        ↓        ↓        ↓             │
│  ┌─────────────────────────────────────────┐           │
│  │ T2 Regression (~150 tests, 2 hr)       │           │
│  │ 5 agents run in parallel                │           │
│  │ Results merged into single report       │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  On failure → Alert to team channel                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Weekly (Sunday 10:00 PM UTC) or Pre-Release            │
│                                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ Ag A │ │ Ag B │ │ Ag C │ │ Ag D │ │ Ag E │        │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│     ↓        ↓        ↓        ↓        ↓             │
│  ┌─────────────────────────────────────────┐           │
│  │ T3 Full (~375 tests, 8 hr)             │           │
│  │ 5 agents + randomized locations         │           │
│  │ Performance benchmarks included         │           │
│  │ Security tests included                 │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  On failure → Open tracking ticket                     │
└─────────────────────────────────────────────────────────┘
```

### Agent Parallelization

All 5 agents run as independent parallel CI jobs. Each agent:
1. Starts the backend server
2. Runs its assigned test suite
3. Writes results to `test-results-agent-{letter}.json`
4. Exits with code 0 (all pass) or 1 (any failure)

A merge job runs after all agents complete:
1. Collects all 5 result files
2. Merges into `test-report.json`
3. Generates summary with pass/fail counts per agent
4. Flags any new regressions vs. previous run
5. Posts summary to PR (for T1) or team channel (for T2/T3)

### Result Schema

```json
{
  "run_id": "T2-2026-03-22-020000",
  "tier": "T2",
  "timestamp": "2026-03-22T02:00:00Z",
  "duration_seconds": 7200,
  "agents": {
    "A": { "pass": 38, "fail": 1, "xfail": 1, "skip": 0 },
    "B": { "pass": 70, "fail": 2, "xfail": 3, "skip": 0 },
    "C": { "pass": 65, "fail": 0, "xfail": 5, "skip": 0 },
    "D": { "pass": 72, "fail": 1, "xfail": 2, "skip": 0 },
    "E": { "pass": 62, "fail": 3, "xfail": 5, "skip": 0 }
  },
  "totals": { "pass": 307, "fail": 7, "xfail": 16, "skip": 0 },
  "new_regressions": ["HTTP-A-036"],
  "random_seed": 42,
  "random_locations_tested": 10
}
```

### Environment Requirements

| Requirement | T1 | T2 | T3 |
|-------------|----|----|-----|
| Backend running | Yes | Yes | Yes |
| PostgreSQL + PostGIS | No | Yes | Yes |
| ANTHROPIC_API_KEY | No | Yes | Yes |
| External API access | Partial | Full | Full |
| Random seed logging | No | No | Yes |

---

## Appendix A: Test ID Naming Convention

```
{SUITE}-{AGENT}-{NUMBER}

SMOKE-001        → Smoke suite, test 1
ADAPT-B-001      → Adapter test, Agent B, test 1
HTTP-A-001       → HTTP endpoint test, Agent A, test 1
WH-001           → What's Here deep test, test 1
WF-1             → Workflow 1
PERF-001         → Performance benchmark, test 1
SEC-001          → Security test, test 1
```

## Appendix B: XFAIL Tag Format

When a test is expected to fail due to a known bug:

```
XFAIL: BUG-001 — estimate_ungaged DRNAREA parameter not mapped
```

The test still runs. If it unexpectedly passes (bug was fixed), it is flagged as XPASS for review.

## Appendix C: Adding New Tests

When adding a new adapter or endpoint:

1. Assign it to the appropriate agent (A-E) based on domain.
2. Create at minimum: 1 ping test, 1 known-answer test, 1 schema validation test.
3. Add the adapter to the reference location table if it has location-specific known answers.
4. Add any known limitations to the XFAIL registry.
5. Update the test counts in Section 3.
