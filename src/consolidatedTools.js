import { z } from 'zod';

/**
 * Consolidated Tool Definitions — 12 smart tools replacing 85 legacy tools
 *
 * Each tool uses an `action` parameter to route to the correct backend endpoint.
 * This dramatically improves LLM tool selection accuracy (research shows accuracy
 * drops from 95% at 5 tools to <14% at 40+ tools).
 *
 * Legacy tools remain available via GEOTAP_LEGACY_TOOLS=true env var.
 */

export const consolidatedTools = [
  // ═══════════════════════════════════════════════════════════════════
  // 1. QUERY LOCATION — The starting point for most queries
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'query_location',
    description: `Query environmental data for any US location. This is the primary tool — start here for most questions.

Actions:
- "address" — Geocode a US address AND query environmental data in one call. Always start here when user gives an address. Returns flood zones, wetlands, soils, habitat, contamination, with plain-English interpretations. Response <5KB.
- "point" — Same as address but when you already have lat/lng coordinates. Response <5KB.
- "nearby" — Find environmental features within a radius of a point. Set geometry="none" and specify layers to keep response small.
- "bbox" — Query features in a bounding box. Set geometry="none" and specify layers.
- "polygon" — Query features in a polygon area. Set geometry="none" and specify layers.
- "summary" — Quick feature counts for an area (no geometry, just numbers). Fastest option for "how many?" questions.
- "geocode" — Convert address/place name to coordinates. Use only when you need coordinates for other tools.
- "list_layers" — List all 71 available data layers.
- "layer_details" — Get metadata about a specific layer.
- "layer_features" — Get features from one specific layer in a bbox.`,
    parameters: {
      action: z.enum(['address', 'point', 'nearby', 'bbox', 'polygon', 'summary', 'geocode', 'list_layers', 'layer_details', 'layer_features'])
        .describe('Which query type to perform'),
      // Address actions
      address: z.string().optional().describe('US street address (for action: address, geocode)'),
      // Coordinate actions
      lat: z.number().optional().describe('Latitude WGS84 (for action: point, nearby)'),
      lng: z.number().optional().describe('Longitude WGS84 (for action: point, nearby)'),
      // Area actions
      bbox: z.string().optional().describe('Bounding box "west,south,east,north" (for action: bbox, layer_features)'),
      polygon: z.object({
        type: z.literal('Polygon'),
        coordinates: z.array(z.array(z.array(z.number())))
      }).optional().describe('GeoJSON Polygon (for action: polygon, summary)'),
      // Filtering
      layers: z.string().optional().describe('Comma-separated layer names (e.g., "flood_zones,wetlands")'),
      geometry: z.enum(['none', 'simplified', 'full']).optional().describe('Geometry detail level. Default: none for MCP. Use "none" unless user specifically needs coordinates.'),
      radius: z.number().optional().describe('Search radius in km for action: nearby (default: 1)'),
      layerName: z.string().optional().describe('Layer identifier for action: layer_details, layer_features'),
    },
    _actionMap: {
      address: 'query_address',
      point: 'identify_features_at_point',
      nearby: 'get_environmental_data_near_point',
      bbox: 'get_environmental_data_in_bbox',
      polygon: 'get_environmental_data_for_area',
      summary: 'get_environmental_summary',
      geocode: 'geocode_address',
      list_layers: 'list_data_layers',
      layer_details: 'get_layer_details',
      layer_features: 'get_layer_features',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. RAINFALL — NOAA Atlas 14, design storms, climate projections
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'get_rainfall',
    description: `Get rainfall and precipitation data from NOAA Atlas 14 for stormwater engineering, flood analysis, and hydrologic design.

Actions:
- "atlas14" — Precipitation frequency estimates (depths & intensities for all durations/return periods). The standard rainfall data for US engineering.
- "idf" — Intensity-Duration-Frequency curve data for charting.
- "hyetograph" — Generate a design storm hyetograph (rainfall over time) for hydrologic modeling.
- "export_hyetograph" — Export hyetograph as CSV/JSON for HEC-HMS, SWMM, etc.
- "distributions" — List available rainfall distribution types (SCS Type I/IA/II/III, Huff, etc.).
- "recommend_distribution" — Determine which distribution type applies at a location.
- "climate_scenarios" — List available SSP scenarios and time horizons.
- "climate_factors" — Get climate change adjustment multipliers for a location.
- "climate_projection" — Apply climate change projections to Atlas 14 data.
- "uncertainty" — Get confidence interval bounds for a specific return period/duration.
- "uncertainty_envelope" — Monte Carlo uncertainty envelope for risk-based design.
- "sensitivity" — Sensitivity analysis on storm parameters.
- "design_approaches" — List design approaches for handling uncertainty.
- "status" — Check NOAA Atlas 14 service availability.`,
    parameters: {
      action: z.enum(['atlas14', 'idf', 'hyetograph', 'export_hyetograph', 'distributions', 'recommend_distribution', 'climate_scenarios', 'climate_factors', 'climate_projection', 'uncertainty', 'uncertainty_envelope', 'sensitivity', 'design_approaches', 'status'])
        .describe('Which rainfall query to perform'),
      lat: z.number().optional().describe('Latitude WGS84'),
      lng: z.number().optional().describe('Longitude WGS84'),
      units: z.enum(['english', 'metric']).optional().describe('Unit system (default: english)'),
      series: z.enum(['pds', 'ams']).optional().describe('Statistical series (default: pds)'),
      returnPeriod: z.string().optional().describe('Return period with "yr" suffix (e.g., "100yr")'),
      returnPeriods: z.string().optional().describe('Comma-separated return periods (e.g., "2,5,10,25,50,100") for IDF'),
      duration: z.number().optional().describe('Storm duration in hours'),
      timeInterval: z.number().optional().describe('Time step in minutes'),
      distribution: z.string().optional().describe('Rainfall distribution type (e.g., "SCS Type II")'),
      horizon: z.string().optional().describe('Climate time horizon: "current", "mid-century", "late-century"'),
      scenario: z.string().optional().describe('Climate scenario: "SSP2-4.5" or "SSP5-8.5"'),
      format: z.enum(['csv', 'json']).optional().describe('Export format for export_hyetograph'),
      nSamples: z.number().optional().describe('Monte Carlo samples for uncertainty_envelope (default: 500)'),
    },
    _actionMap: {
      atlas14: 'get_rainfall_data',
      idf: 'get_idf_curves',
      hyetograph: 'generate_hyetograph',
      export_hyetograph: 'export_hyetograph',
      distributions: 'list_rainfall_distributions',
      recommend_distribution: 'get_rainfall_distribution',
      climate_scenarios: 'get_climate_scenarios',
      climate_factors: 'get_climate_change_factors',
      climate_projection: 'get_climate_change_rainfall_projection',
      uncertainty: 'get_rainfall_uncertainty_bounds',
      uncertainty_envelope: 'generate_uncertainty_envelope',
      sensitivity: 'run_rainfall_sensitivity_analysis',
      design_approaches: 'get_design_approaches',
      status: 'check_rainfall_service_status',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3. WATERSHED — Delineation, flow statistics, HUC boundaries
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'get_watershed',
    description: `Watershed delineation, flow statistics, stream networks, water quality, HUC boundaries, and FEMA flood map panels.

Actions:
- "delineate" — Trace watershed boundary for a pour point using USGS StreamStats. Returns drainage area polygon + basin characteristics.
- "characteristics" — Get physical/hydrologic basin characteristics (area, slope, precip, impervious %).
- "flow_statistics" — Estimated peak flows (2yr-500yr) and low flows from USGS regional regression.
- "flowlines" — Stream network (rivers, creeks) in a bounding box from NHD.
- "water_quality" — Water quality impairments (303d listed) for a watershed extent.
- "huc_boundaries" — HUC-8/10/12 watershed boundaries for a bounding box.
- "huc_by_code" — Get a specific HUC watershed boundary by its code.
- "firm_panels" — FEMA FIRM panel numbers for an area.`,
    parameters: {
      action: z.enum(['delineate', 'characteristics', 'flow_statistics', 'flowlines', 'water_quality', 'huc_boundaries', 'huc_by_code', 'firm_panels'])
        .describe('Which watershed query to perform'),
      lat: z.number().optional().describe('Latitude WGS84 (for delineate, characteristics, flow_statistics)'),
      lng: z.number().optional().describe('Longitude WGS84'),
      bbox: z.string().optional().describe('Bounding box "west,south,east,north" (for flowlines, water_quality, huc_boundaries, firm_panels)'),
      region: z.string().optional().describe('StreamStats region code (auto-detected if omitted)'),
      drainageArea: z.number().optional().describe('Known drainage area in sq mi (improves flow_statistics accuracy)'),
      huc12: z.string().optional().describe('HUC-12 code (for water_quality if known)'),
      hucCode: z.string().optional().describe('HUC code for huc_by_code'),
      hucLevel: z.enum(['8', '10', '12']).optional().describe('HUC level for huc_boundaries (default: 12)'),
    },
    _actionMap: {
      delineate: 'delineate_watershed',
      characteristics: 'get_watershed_characteristics',
      flow_statistics: 'get_flow_statistics',
      flowlines: 'get_flowlines',
      water_quality: 'get_watershed_water_quality',
      huc_boundaries: 'get_huc_watersheds',
      huc_by_code: 'get_huc_watershed_by_code',
      firm_panels: 'get_firm_panels',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. HYDROLOGY — Curve numbers, runoff, engineering calculations
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'get_hydrology',
    description: `Hydrologic engineering calculations: curve numbers, runoff, time of concentration, peak discharge.

Actions:
- "analyze" — Comprehensive hydrologic analysis on catchments: composite CN, Tc, SCS runoff depth, peak discharge (Rational, TR-55, regression). The all-in-one hydrology tool.
- "distributions" — List rainfall distribution types for hydrologic analysis.
- "distribution_for_location" — Recommended SCS distribution for a specific location.
- "lookup_cn" — Look up SCS curve number for a specific land use (NLCD code) + soil type (HSG).
- "cn_tables" — Full SCS curve number reference tables.
- "analyze_cn" — Calculate weighted curve numbers for catchments using NLCD + SSURGO data.`,
    parameters: {
      action: z.enum(['analyze', 'distributions', 'distribution_for_location', 'lookup_cn', 'cn_tables', 'analyze_cn'])
        .describe('Which hydrology calculation to perform'),
      lat: z.number().optional().describe('Latitude WGS84 (for distribution_for_location)'),
      lng: z.number().optional().describe('Longitude WGS84'),
      catchments: z.any().optional().describe('GeoJSON FeatureCollection of catchment polygons (for analyze, analyze_cn)'),
      options: z.any().optional().describe('Analysis options: {hydrologicCondition, dualHSGTreatment, returnPeriods, durations}'),
      nlcd: z.number().optional().describe('NLCD land cover code for lookup_cn (e.g., 21=Developed Open Space)'),
      hsg: z.string().optional().describe('Hydrologic Soil Group A/B/C/D for lookup_cn'),
      condition: z.string().optional().describe('Antecedent moisture: "good", "fair", "poor" for lookup_cn'),
    },
    _actionMap: {
      analyze: 'analyze_hydrology',
      distributions: 'get_hydrology_distributions',
      distribution_for_location: 'get_hydrology_distribution_for_location',
      lookup_cn: 'lookup_curve_number',
      cn_tables: 'get_curve_number_tables',
      analyze_cn: 'analyze_curve_numbers',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5. WATER QUALITY — EPA ATTAINS, impairments, receiving waters
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'get_water_quality',
    description: `Water quality impairment data from EPA ATTAINS — 303(d) listed impaired waters, pollutants, designated uses.

Actions:
- "assessment" — Full water quality assessment for a location: impaired waters, pollutants, downstream receiving water trace.
- "impairments" — Quick impairment check by HUC-12 code. Faster when you know the HUC.
- "find_watershed" — Identify which HUC-12 watershed a point falls within.`,
    parameters: {
      action: z.enum(['assessment', 'impairments', 'find_watershed'])
        .describe('Which water quality query to perform'),
      lat: z.number().optional().describe('Latitude WGS84 (for find_watershed)'),
      lng: z.number().optional().describe('Longitude WGS84'),
      location: z.any().optional().describe('GeoJSON Point or Polygon (for assessment)'),
      huc12: z.string().optional().describe('12-digit HUC code (for impairments)'),
      options: z.object({
        includeDownstream: z.boolean().optional(),
        radiusKm: z.number().optional(),
      }).optional().describe('Assessment options'),
    },
    _actionMap: {
      assessment: 'get_water_quality',
      impairments: 'get_water_impairments',
      find_watershed: 'get_watershed_for_point',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 6. ELEVATION — USGS 3DEP, contours, DEM, land use, imagery
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'get_elevation',
    description: `Elevation, terrain, land use, and satellite imagery from USGS 3DEP, NLCD, and NAIP.

Actions:
- "stats" — Elevation statistics (min, max, mean, range) for a bounding box.
- "contours" — Generate contour lines at specified intervals for a bbox.
- "contour_options" — Available contour interval options.
- "export_dem" — Export DEM as GeoTIFF (1m/10m/30m resolution).
- "export_contours" — Export contour lines as GeoJSON for a polygon.
- "availability" — Check which DEM resolutions are available for an area.
- "resolution_options" — List supported DEM resolution options.
- "export_land_use" — Export NLCD land cover data as GeoTIFF or polygons.
- "export_satellite" — Export aerial photography as GeoTIFF.
- "satellite_options" — Available satellite imagery resolutions.`,
    parameters: {
      action: z.enum(['stats', 'contours', 'contour_options', 'export_dem', 'export_contours', 'availability', 'resolution_options', 'export_land_use', 'export_satellite', 'satellite_options'])
        .describe('Which elevation/terrain query to perform'),
      bbox: z.string().optional().describe('Bounding box "west,south,east,north" (for stats, contours, availability)'),
      polygon: z.any().optional().describe('GeoJSON Polygon (for export_dem, export_contours, export_land_use, export_satellite)'),
      interval: z.number().optional().describe('Contour interval in feet'),
      intervalMeters: z.number().optional().describe('Contour interval in meters'),
      resolution: z.string().optional().describe('DEM resolution "1m"/"10m"/"30m" or satellite "high"/"medium"/"low"'),
      targetCrs: z.string().optional().describe('Target CRS (e.g., "EPSG:2277")'),
      convertToFeet: z.boolean().optional().describe('Convert elevations to feet'),
      clipToPolygon: z.boolean().optional().describe('Clip raster to polygon boundary'),
      format: z.enum(['geotiff', 'polygons']).optional().describe('Land use export format'),
      demResolution: z.enum(['1m', '10m', '30m']).optional().describe('DEM resolution for contour export'),
    },
    _actionMap: {
      stats: 'get_elevation_stats',
      contours: 'get_contour_lines',
      contour_options: 'get_contour_interval_options',
      export_dem: 'export_dem',
      export_contours: 'export_contours',
      availability: 'check_dem_availability',
      resolution_options: 'get_dem_resolution_options',
      export_land_use: 'export_land_use',
      export_satellite: 'export_satellite_imagery',
      satellite_options: 'get_satellite_resolution_options',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 7. GAGE ANALYSIS — Stream gage data, flood frequency, storm events
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'analyze_gage',
    description: `Analyze USGS stream gage data: flood frequency, flow duration, low flow, storm events, and published statistics.

Actions:
- "summary" — Quick overview of a gage: period of record, drainage area, key flows.
- "flood_frequency" — Bulletin 17C flood frequency analysis (2yr-500yr peak flows).
- "flow_duration" — Flow duration curve and percentiles (Q1 through Q99).
- "low_flow" — Low flow statistics: 7Q10, 7Q2, harmonic mean. Critical for NPDES permits.
- "storm_events" — Detect storm events from flow record with peak, volume, duration.
- "storm_detail" — Detailed hydrograph for a specific storm event.
- "export_storm" — Export storm hydrograph for HEC-HMS or other models.
- "published_stats" — Official USGS GageStats published values (peer-reviewed).
- "compare_stats" — Compare computed vs. published statistics for QA.`,
    parameters: {
      action: z.enum(['summary', 'flood_frequency', 'flow_duration', 'low_flow', 'storm_events', 'storm_detail', 'export_storm', 'published_stats', 'compare_stats'])
        .describe('Which gage analysis to perform'),
      siteId: z.string().describe('USGS station ID (e.g., "08158000")'),
      eventId: z.string().optional().describe('Storm event ID (for storm_detail, export_storm)'),
      minYears: z.number().optional().describe('Minimum years of record required'),
      startDate: z.string().optional().describe('Start date YYYY-MM-DD (for flow_duration)'),
      endDate: z.string().optional().describe('End date YYYY-MM-DD (for flow_duration)'),
      period: z.string().optional().describe('Time period "1y"/"5y"/"10y" (for storm_events)'),
      minPeak: z.number().optional().describe('Minimum peak flow in cfs (for storm_events)'),
      format: z.string().optional().describe('Export format (default: "hec-hms")'),
    },
    _actionMap: {
      summary: 'get_gage_summary',
      flood_frequency: 'get_flood_frequency_analysis',
      flow_duration: 'get_flow_duration_curve',
      low_flow: 'get_low_flow_statistics',
      storm_events: 'get_storm_events',
      storm_detail: 'get_storm_event_detail',
      export_storm: 'export_storm_event_for_modeling',
      published_stats: 'get_published_gage_statistics',
      compare_stats: 'compare_computed_vs_published_stats',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 8. UNGAGED ESTIMATION — Flow estimates at sites without gages
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'estimate_ungaged',
    description: `Estimate flows at ungaged sites using USGS regional regression, watershed similarity, and drainage area transfer methods.

Actions:
- "flood_frequency" — Estimate flood flows using NSS regional regression equations. Requires state, region, and basin characteristics.
- "all_statistics" — Estimate ALL available flow statistics (peak, low, duration) for an ungaged site.
- "nss_regions" — List available NSS regions for a state.
- "required_parameters" — What basin characteristics are needed for a state/region.
- "find_similar" — Find gauged watersheds with similar physical characteristics.
- "find_similar_with_stats" — Similar watersheds + their published flow statistics.
- "recommend_index" — Find the best reference gage for flow transfer.
- "transfer_stats" — Transfer flood statistics from a reference gage using drainage area ratio.`,
    parameters: {
      action: z.enum(['flood_frequency', 'all_statistics', 'nss_regions', 'required_parameters', 'find_similar', 'find_similar_with_stats', 'recommend_index', 'transfer_stats'])
        .describe('Which estimation method to use'),
      lat: z.number().optional().describe('Latitude of ungaged site'),
      lng: z.number().optional().describe('Longitude of ungaged site'),
      state: z.string().optional().describe('US state code (e.g., "TX")'),
      region: z.string().optional().describe('NSS region code'),
      parameters: z.any().optional().describe('Basin characteristics object (e.g., {drainageArea: 10.5, meanBasinSlope: 3.2})'),
      characteristics: z.any().optional().describe('Known basin characteristics for similarity matching'),
      maxDistance: z.number().optional().describe('Max search distance in km for similarity'),
      limit: z.number().optional().describe('Max results'),
      indexSiteId: z.string().optional().describe('Reference gage ID for transfer_stats'),
      targetDrainageArea: z.number().optional().describe('Ungaged site drainage area in sq mi for transfer_stats'),
      drainageArea: z.number().optional().describe('Drainage area for recommend_index'),
    },
    _actionMap: {
      flood_frequency: 'estimate_ungaged_flood_frequency',
      all_statistics: 'estimate_all_ungaged_statistics',
      nss_regions: 'get_ungaged_nss_regions',
      required_parameters: 'get_ungaged_required_parameters',
      find_similar: 'find_similar_watersheds',
      find_similar_with_stats: 'find_similar_watersheds_with_stats',
      recommend_index: 'recommend_index_gage',
      transfer_stats: 'transfer_flood_statistics',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 9. GENERATE REPORT — Site analysis, constraints, developability
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'generate_report',
    description: `Generate comprehensive environmental reports for development sites.

Actions:
- "site_analysis" — Full environmental site analysis: flood risk, wetlands, soils, hazards, habitat, contamination. Returns developability score 0-100.
- "site_analysis_status" — Check status of a site analysis job (can take 30-60s).
- "constraints" — Environmental constraints report: floodway, flood zones, wetlands, hydric soils, steep slopes. Calculates constrained vs. developable area.
- "constraints_status" — Check status of constraints report job.
- "constraints_config" — Available constraint report options.
- "developability" — Site developability assessment with 0-100 score and penalty breakdown.
- "developability_config" — Available developability assessment options.`,
    parameters: {
      action: z.enum(['site_analysis', 'site_analysis_status', 'constraints', 'constraints_status', 'constraints_config', 'developability', 'developability_config'])
        .describe('Which report to generate or check'),
      geometry: z.any().optional().describe('GeoJSON Point or Polygon for the site'),
      projectName: z.string().optional().describe('Project name for report'),
      clientName: z.string().optional().describe('Client name for report'),
      jobId: z.string().optional().describe('Job ID for status checks'),
      options: z.any().optional().describe('Report options'),
    },
    _actionMap: {
      site_analysis: 'generate_site_analysis',
      site_analysis_status: 'get_site_analysis_status',
      constraints: 'generate_constraints_report',
      constraints_status: 'get_constraints_report_status',
      constraints_config: 'get_constraints_config',
      developability: 'generate_developability_report',
      developability_config: 'get_developability_config',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 10. EXPORT DATA — Multi-format GIS export
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'export_data',
    description: `Export environmental data layers to GIS formats (GeoJSON, Shapefile, KML, CSV, GeoPackage).

Actions:
- "export" — Export layers to a file format. Supports CRS transformation and clipping.
- "options" — List available export formats and CRS options.
- "status" — Check export job status.`,
    parameters: {
      action: z.enum(['export', 'options', 'status'])
        .describe('Which export operation'),
      layers: z.array(z.string()).optional().describe('Layer names to export'),
      format: z.enum(['geojson', 'shapefile', 'kml', 'csv', 'geopackage']).optional().describe('Output format'),
      crs: z.string().optional().describe('Target CRS (e.g., "EPSG:4326")'),
      geometry: z.any().optional().describe('GeoJSON geometry to clip export area'),
      options: z.any().optional().describe('Additional options: {dem, satellite, nlcd, contours}'),
      jobId: z.string().optional().describe('Job ID for status check'),
    },
    _actionMap: {
      export: 'export_data',
      options: 'get_export_options',
      status: 'get_export_status',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 11. FIND STATIONS — Monitoring stations & permits
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'find_stations',
    description: `Search for environmental monitoring stations (USGS streamgages, groundwater wells, weather stations, tide gauges) and analyze waterway permit requirements.

Actions:
- "search_area" — Find stations near a location or in a bounding box.
- "search_name" — Search stations by name or ID.
- "station_types" — List all available station types.
- "find_water_features" — Find streams, wetlands, waterbodies for permit analysis.
- "analyze_permits" — Determine required permits (Section 404, NPDES, etc.) for an activity near water.`,
    parameters: {
      action: z.enum(['search_area', 'search_name', 'station_types', 'find_water_features', 'analyze_permits'])
        .describe('Which search to perform'),
      // Station search params
      bbox: z.string().optional().describe('Bounding box for area search'),
      source: z.string().optional().describe('Data source filter: "usgs", "noaa"'),
      type: z.string().optional().describe('Station type: "stream_gage", "groundwater", "tide", "precipitation"'),
      state: z.string().optional().describe('US state code'),
      q: z.string().optional().describe('Search query for search_name'),
      limit: z.number().optional().describe('Max results'),
      // Permit params
      polygon: z.any().optional().describe('GeoJSON Polygon for find_water_features'),
      selectedFeatures: z.any().optional().describe('Water features from find_water_features for analyze_permits'),
      activityType: z.enum(['crossing', 'utility_crossing', 'stormwater_discharge', 'wetland_fill', 'bank_stabilization', 'adjacent_construction']).optional()
        .describe('Activity type for analyze_permits'),
      location: z.any().optional().describe('GeoJSON Point for activity location'),
    },
    _actionMap: {
      search_area: 'find_monitoring_stations',
      search_name: 'search_stations',
      station_types: 'get_station_types',
      find_water_features: 'find_water_features',
      analyze_permits: 'analyze_permit_requirements',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 12. CHECK STATUS — API health
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'check_status',
    description: `Check GeoTap API health and federal data source connectivity.

Actions:
- "all" — Check all connected federal APIs (FEMA, USGS, EPA, NOAA, etc.).
- "specific" — Check one specific API.`,
    parameters: {
      action: z.enum(['all', 'specific']).describe('Check all APIs or a specific one'),
      apiName: z.string().optional().describe('API name for specific check: "fema", "usgs", "epa", "noaa", "nrcs"'),
    },
    _actionMap: {
      all: 'check_api_status',
      specific: 'check_specific_api_status',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 13. GET HAZARDS — Natural hazards, risk, and vulnerability data
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'get_hazards',
    description: `Query natural hazard and risk data for a location — FEMA risk index, seismic design, wildfires, landslides, coastal vulnerability, flood insurance claims, and social vulnerability.

Actions:
- "nri" — FEMA National Risk Index: overall risk score, expected annual loss, 18 hazard types (earthquake, hurricane, tornado, flooding, wildfire, etc.) at the county level.
- "seismic_design" — USGS seismic design values (ASCE 7-22): spectral acceleration, peak ground acceleration, site class. Required for structural engineering.
- "wildfires" — Current and recent wildfire perimeters from NIFC: fire name, acres burned, containment percentage.
- "landslides" — USGS landslide inventory: historical landslide locations, types, damage reports.
- "coastal" — USGS Coastal Vulnerability Index: geomorphology, coastal slope, sea level rise, tide range, wave height, erosion rate.
- "nfip_claims" — FEMA NFIP flood insurance claims by county: dates of loss, amounts paid, flood zones.
- "social_vulnerability" — CDC Social Vulnerability Index: socioeconomic status, household composition, minority status, housing type (0-1 scale, tract level).`,
    parameters: {
      action: z.enum(['nri', 'seismic_design', 'wildfires', 'landslides', 'coastal', 'nfip_claims', 'social_vulnerability'])
        .describe('Which hazard/risk data to query'),
      lat: z.number().optional().describe('Latitude WGS84 (for seismic_design)'),
      lng: z.number().optional().describe('Longitude WGS84 (for seismic_design)'),
      bbox: z.string().optional().describe('Bounding box "west,south,east,north" (for nri, wildfires, landslides, coastal, social_vulnerability)'),
      countyFips: z.string().optional().describe('5-digit county FIPS code (for nfip_claims)'),
      geometry: z.enum(['none', 'simplified', 'full']).optional().describe('Geometry detail level (default: none)'),
    },
    _actionMap: {
      nri: 'get_nri_risk',
      seismic_design: 'get_seismic_design_values',
      wildfires: 'get_wildfire_perimeters',
      landslides: 'get_landslide_data',
      coastal: 'get_coastal_vulnerability',
      nfip_claims: 'get_nfip_claims',
      social_vulnerability: 'get_social_vulnerability',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 14. GET ENERGY — Solar, utility rates, EV charging, electricity
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'get_energy',
    description: `Query energy data for a location — solar resource, solar production estimates, utility rates, EV charging stations.

Actions:
- "solar" — NREL solar resource data: direct normal irradiance (DNI), global horizontal irradiance (GHI), latitude tilt irradiance. Monthly and annual.
- "pvwatts" — NREL PVWatts solar energy production estimate: annual kWh output, capacity factor. Configurable system size and panel orientation.
- "utility_rates" — NREL utility rate data: utility company name, residential/commercial/industrial rates ($/kWh).
- "alt_fuel" — DOE alternative fuel stations: EV chargers, CNG, hydrogen, etc. Includes network, connector types, and availability.`,
    parameters: {
      action: z.enum(['solar', 'pvwatts', 'utility_rates', 'alt_fuel'])
        .describe('Which energy data to query'),
      lat: z.number().optional().describe('Latitude WGS84'),
      lng: z.number().optional().describe('Longitude WGS84'),
      system_capacity: z.number().optional().describe('Solar system size in kW for pvwatts (default: 4)'),
      tilt: z.number().optional().describe('Panel tilt angle for pvwatts (default: 20)'),
      azimuth: z.number().optional().describe('Panel azimuth for pvwatts, 180=south (default: 180)'),
      radius: z.number().optional().describe('Search radius in miles for alt_fuel (default: 25)'),
    },
    _actionMap: {
      solar: 'get_solar_resource',
      pvwatts: 'get_solar_estimate',
      utility_rates: 'get_utility_rates',
      alt_fuel: 'get_alt_fuel_stations',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 15. GET INFRASTRUCTURE — HIFLD critical infrastructure
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'get_infrastructure',
    description: `Query critical infrastructure data from HIFLD and DOT — hospitals, fire stations, schools, law enforcement, power plants, EMS, airports, railroad crossings, bridges, and historic places.

Actions:
- "hospitals" — Hospitals: beds, trauma level, helipad, ownership type.
- "fire_stations" — Fire stations: type, status.
- "schools" — Public schools: enrollment, grade levels, teacher count.
- "power_plants" — Power plants: fuel type, installed capacity (MW).
- "airports" — FAA airports: facility type, ownership, operations counts.
- "railroad_crossings" — FRA highway-rail crossings: warning devices, trains/day, crash data.
- "bridges" — DOT bridges: condition ratings (0-9), sufficiency rating (0-100), year built.
- "historic_places" — National Register of Historic Places: significance, category, period.`,
    parameters: {
      action: z.enum(['hospitals', 'fire_stations', 'schools', 'power_plants', 'airports', 'railroad_crossings', 'bridges', 'historic_places'])
        .describe('Which infrastructure data to query'),
      bbox: z.string().describe('Bounding box "west,south,east,north"'),
      geometry: z.enum(['none', 'simplified', 'full']).optional().describe('Geometry detail level (default: none)'),
    },
    _actionMap: {
      hospitals: 'get_hospitals',
      fire_stations: 'get_fire_stations',
      schools: 'get_schools',
      power_plants: 'get_power_plants',
      airports: 'get_airports',
      railroad_crossings: 'get_railroad_crossings',
      bridges: 'get_bridges',
      historic_places: 'get_historic_places',
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 16. GET ECOLOGY — Species, fish habitat, water quality stations
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'get_ecology',
    description: `Query ecological and biodiversity data — species occurrences, essential fish habitat, water quality monitoring stations.

Actions:
- "species" — GBIF species occurrence records: scientific name, kingdom, family, observation date, IUCN status.
- "fish_habitat" — NOAA Essential Fish Habitat: species, habitat type, life stage, fishery management council.`,
    parameters: {
      action: z.enum(['species', 'fish_habitat'])
        .describe('Which ecology data to query'),
      bbox: z.string().describe('Bounding box "west,south,east,north"'),
      limit: z.number().optional().describe('Max records for species (default: 300)'),
      geometry: z.enum(['none', 'simplified', 'full']).optional().describe('Geometry detail level (default: none)'),
    },
    _actionMap: {
      species: 'get_species_occurrences',
      fish_habitat: 'get_fish_habitat',
    }
  },
];
