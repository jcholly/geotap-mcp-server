import { z } from 'zod';

/**
 * GeoTap MCP Tool Definitions
 *
 * Each tool wraps a GeoTap API endpoint. Tool descriptions are written to be
 * highly descriptive so that LLMs can accurately determine when to use each tool.
 *
 * Data sources include: FEMA (flood zones, FIRM panels), USGS (geology, streamgages,
 * groundwater, elevation, land use), EPA (water quality, impairments, Superfund,
 * brownfields, TRI), NOAA (rainfall, tide stations, climate), USDA/NRCS (soils,
 * curve numbers), USFWS (wetlands, endangered species), DOT (bridges, tunnels),
 * Census (demographics, boundaries), and more.
 */

export const tools = [
  // ─── SPATIAL QUERIES ───────────────────────────────────────────────
  {
    name: 'get_environmental_data_for_area',
    description: `Query all available US federal environmental and infrastructure data within a geographic area (polygon). Returns features from 28+ data sources including FEMA flood zones, NWI wetlands, USDA soils, USGS geology, EPA sites (Superfund, brownfields, TRI), USFWS critical habitat, DOT bridges, power plants, dams, mines, and more. Use this tool when someone asks about environmental conditions, site constraints, development feasibility, or regulatory concerns for a specific area. Accepts a GeoJSON polygon (e.g., a property boundary, project site, or any area of interest). This is the most comprehensive tool — it returns everything available for the given area.`,
    parameters: {
      polygon: z.object({
        type: z.literal('Polygon'),
        coordinates: z.array(z.array(z.array(z.number())))
      }).describe('GeoJSON Polygon geometry defining the area of interest'),
      layers: z.array(z.string()).optional().describe('Optional array of specific layer names to query. If omitted, all layers are queried.')
    },
    endpoint: '/spatial/in-polygon',
    method: 'POST'
  },
  {
    name: 'get_environmental_data_near_point',
    description: `Query all available US federal environmental and infrastructure data near a specific point (latitude/longitude). Returns features within a given radius from 28+ data sources including FEMA flood zones, NWI wetlands, USDA soils, USGS geology, EPA sites, endangered species habitat, bridges, dams, and more. Use this tool when someone asks "what's near this location?" or provides an address/coordinates and wants to know about environmental conditions in the vicinity. Great for quick site screening.`,
    parameters: {
      lat: z.number().describe('Latitude of the center point (WGS84)'),
      lng: z.number().describe('Longitude of the center point (WGS84)'),
      radius: z.number().optional().describe('Search radius in kilometers (default: 1)'),
      layers: z.string().optional().describe('Comma-separated layer names to query. If omitted, all layers are queried.')
    },
    endpoint: '/spatial/near',
    method: 'GET'
  },
  {
    name: 'get_environmental_summary',
    description: `Get a quick count of environmental features within an area without returning full feature details. Returns the number of flood zones, wetlands, soil types, EPA sites, etc. found within the polygon. Use this tool for a fast overview of what environmental constraints exist in an area before doing a full detailed query. Much faster than get_environmental_data_for_area when you just need to know "how many?" rather than full details.`,
    parameters: {
      polygon: z.object({
        type: z.literal('Polygon'),
        coordinates: z.array(z.array(z.array(z.number())))
      }).describe('GeoJSON Polygon geometry defining the area of interest'),
      layers: z.array(z.string()).optional().describe('Optional array of specific layer names to query')
    },
    endpoint: '/spatial/summary',
    method: 'POST'
  },

  // ─── DATA LAYERS ───────────────────────────────────────────────────
  {
    name: 'list_data_layers',
    description: `List all available environmental and infrastructure data layers in GeoTap. Returns the full catalog of 28+ data sources with their names, descriptions, and data providers. Use this tool when someone asks "what data do you have?" or "what sources are available?" or wants to know what types of environmental data can be queried. Includes layers from FEMA, USGS, EPA, NOAA, USDA, USFWS, DOT, Census, and more.`,
    parameters: {},
    endpoint: '/layers',
    method: 'GET'
  },
  {
    name: 'get_layer_features',
    description: `Get features from a specific data layer within a bounding box. Use this tool when you need data from one specific source (e.g., just flood zones, or just wetlands) rather than all sources at once. Layer names include: fema-flood-zones, nwi-wetlands, usda-soils, usgs-geology, epa-superfund, epa-brownfields, epa-tri, usfws-critical-habitat, dot-bridges, power-plants, dams, mines, and more.`,
    parameters: {
      layerName: z.string().describe('The layer identifier (e.g., "fema-flood-zones", "nwi-wetlands", "usda-soils")'),
      bbox: z.string().describe('Bounding box as "west,south,east,north" in WGS84 coordinates')
    },
    endpoint: '/layers/{layerName}/features',
    method: 'GET'
  },

  // ─── RAINFALL & PRECIPITATION ──────────────────────────────────────
  {
    name: 'get_rainfall_data',
    description: `Get NOAA Atlas 14 precipitation frequency estimates for a US location. Returns rainfall depths and intensities for various storm durations (5 minutes to 60 days) and return periods (1-year to 1000-year). This is the standard rainfall data used in stormwater engineering, flood analysis, and hydrologic design across the United States. Use this tool when someone asks about rainfall amounts, precipitation frequency, design storms, or "how much rain falls at this location?" for engineering or planning purposes.`,
    parameters: {
      lat: z.number().describe('Latitude (WGS84)'),
      lon: z.number().describe('Longitude (WGS84)'),
      units: z.enum(['english', 'metric']).optional().describe('Unit system (default: english = inches, metric = millimeters)'),
      series: z.enum(['pds', 'ams']).optional().describe('Statistical series: pds (partial duration) or ams (annual maximum). Default: pds')
    },
    endpoint: '/rainfall/atlas14',
    method: 'GET'
  },
  {
    name: 'get_idf_curves',
    description: `Get Intensity-Duration-Frequency (IDF) curve data for a US location. IDF curves show rainfall intensity vs. storm duration for different return periods. Essential for stormwater design, drainage engineering, and hydraulic calculations. Returns data formatted for charting IDF curves. Use this tool when an engineer asks for IDF data or when designing stormwater infrastructure.`,
    parameters: {
      lat: z.number().describe('Latitude (WGS84)'),
      lon: z.number().describe('Longitude (WGS84)'),
      units: z.enum(['english', 'metric']).optional().describe('Unit system (default: english)'),
      series: z.enum(['pds', 'ams']).optional().describe('Statistical series (default: pds)'),
      returnPeriods: z.string().optional().describe('Comma-separated return periods in years (e.g., "2,5,10,25,50,100")')
    },
    endpoint: '/rainfall/atlas14/idf',
    method: 'GET'
  },
  {
    name: 'generate_hyetograph',
    description: `Generate a design storm hyetograph (rainfall over time) for a specific location, return period, and duration. A hyetograph shows how rainfall is distributed across a storm event and is required for hydrologic modeling (HEC-HMS, SWMM, etc.). Supports multiple rainfall distributions (SCS Type I, IA, II, III, Huff distributions, etc.). Use this tool when an engineer needs a design storm for modeling, or when someone asks how rainfall is distributed during a storm event.`,
    parameters: {
      latitude: z.number().describe('Latitude (WGS84)'),
      longitude: z.number().describe('Longitude (WGS84)'),
      returnPeriod: z.number().describe('Return period in years (e.g., 2, 5, 10, 25, 50, 100)'),
      duration: z.number().describe('Storm duration in hours (e.g., 1, 2, 6, 12, 24)'),
      timeInterval: z.number().describe('Time step in minutes (e.g., 5, 10, 15, 30, 60)'),
      distribution: z.string().describe('Rainfall distribution type (e.g., "SCS Type II", "SCS Type III", "Huff First Quartile")'),
      units: z.enum(['english', 'metric']).optional().describe('Unit system (default: english)')
    },
    endpoint: '/rainfall/hyetograph',
    method: 'POST'
  },
  {
    name: 'get_rainfall_distribution',
    description: `Determine which rainfall distribution type (SCS Type I, IA, II, III, etc.) is appropriate for a given US location based on NOAA regional maps. Use this tool before generating a hyetograph if you don't know which distribution to use. Different regions of the US use different standard rainfall distributions for engineering design.`,
    parameters: {
      lat: z.number().describe('Latitude (WGS84)'),
      lon: z.number().describe('Longitude (WGS84)')
    },
    endpoint: '/rainfall/recommend',
    method: 'GET'
  },
  {
    name: 'get_climate_change_rainfall_projection',
    description: `Apply climate change projections to Atlas 14 rainfall data for a US location. Returns adjusted precipitation depths under different climate scenarios (SSP2-4.5, SSP5-8.5) and future time horizons (2050, 2080). Use this tool when someone asks about future rainfall under climate change, or when designing infrastructure that needs to account for changing precipitation patterns.`,
    parameters: {
      latitude: z.number().describe('Latitude (WGS84)'),
      longitude: z.number().describe('Longitude (WGS84)'),
      returnPeriod: z.number().describe('Return period in years'),
      duration: z.number().describe('Storm duration in hours'),
      horizon: z.string().describe('Future time horizon (e.g., "2050", "2080")'),
      scenario: z.string().describe('Climate scenario (e.g., "SSP2-4.5", "SSP5-8.5")'),
      units: z.enum(['english', 'metric']).optional().describe('Unit system (default: english)')
    },
    endpoint: '/rainfall/climate/project',
    method: 'POST'
  },

  // ─── WATERSHED & HYDROLOGY ─────────────────────────────────────────
  {
    name: 'delineate_watershed',
    description: `Delineate (trace) the watershed boundary for a given pour point location using USGS StreamStats. Returns the drainage area boundary as a GeoJSON polygon along with basin characteristics (area, slope, precipitation, land use, etc.). A watershed is the area of land that drains to a specific point. Use this tool when someone asks "what is the drainage area?" or "delineate the watershed" for a point, or when calculating stormwater runoff for a site.`,
    parameters: {
      lat: z.number().describe('Latitude of the pour point / outlet (WGS84)'),
      lng: z.number().describe('Longitude of the pour point / outlet (WGS84)')
    },
    endpoint: '/watershed/delineate',
    method: 'POST'
  },
  {
    name: 'get_watershed_characteristics',
    description: `Get physical and hydrologic characteristics for a watershed at a given location. Returns drainage area, mean basin slope, mean annual precipitation, percent impervious, percent forest, and other characteristics used in hydrologic calculations. Use this when you need basin parameters for flood analysis, curve number calculations, or hydrologic modeling.`,
    parameters: {
      lat: z.number().describe('Latitude (WGS84)'),
      lng: z.number().describe('Longitude (WGS84)'),
      region: z.string().optional().describe('StreamStats region code (auto-detected if omitted)')
    },
    endpoint: '/watershed/characteristics',
    method: 'GET'
  },
  {
    name: 'get_flow_statistics',
    description: `Get peak flow and low flow statistics for a location using USGS regional regression equations. Returns estimated peak flows for various return periods (2-year through 500-year) and low flow statistics (7Q10, etc.). These are used for bridge/culvert sizing, floodplain analysis, and water supply planning. Use this tool when someone asks "what is the 100-year flood flow?" or needs design flows for a stream crossing.`,
    parameters: {
      lat: z.number().describe('Latitude (WGS84)'),
      lng: z.number().describe('Longitude (WGS84)'),
      region: z.string().optional().describe('StreamStats region code (auto-detected if omitted)'),
      drainageArea: z.number().optional().describe('Known drainage area in square miles (improves accuracy)')
    },
    endpoint: '/watershed/flow-statistics',
    method: 'GET'
  },

  // ─── CURVE NUMBER ──────────────────────────────────────────────────
  {
    name: 'lookup_curve_number',
    description: `Look up the SCS/NRCS Curve Number for a specific land use and soil type combination. The Curve Number (CN) is used to estimate stormwater runoff volume from rainfall. Returns the CN value based on NLCD land cover classification and Hydrologic Soil Group (A, B, C, D). Use this tool when someone asks about runoff calculations, curve numbers, or stormwater volume estimation for a specific land use and soil type.`,
    parameters: {
      nlcd: z.number().describe('NLCD land cover code (e.g., 21=Developed Open Space, 22=Low Intensity, 23=Medium Intensity, 24=High Intensity, 41=Deciduous Forest, 82=Cultivated Crops)'),
      hsg: z.string().describe('Hydrologic Soil Group (A, B, C, or D). A=sandy/well-drained, D=clay/poorly-drained'),
      condition: z.string().optional().describe('Antecedent moisture condition: "good", "fair", or "poor" (default: good)')
    },
    endpoint: '/cn/lookup',
    method: 'GET'
  },
  {
    name: 'analyze_curve_numbers',
    description: `Calculate weighted Curve Numbers for one or more catchment areas using satellite land use data (NLCD) and USDA soil survey data. Automatically determines the land use and soil type within each catchment and computes the area-weighted CN. Use this tool when someone has a drainage area (from watershed delineation or a project boundary) and needs the composite CN for runoff calculations. Accepts GeoJSON features as input.`,
    parameters: {
      catchments: z.any().describe('GeoJSON FeatureCollection of catchment polygons to analyze'),
      options: z.object({
        hydrologicCondition: z.string().optional().describe('Antecedent moisture: "good", "fair", or "poor"'),
        dualHSGTreatment: z.string().optional().describe('How to handle dual HSG soils: "undrained" or "drained"')
      }).optional().describe('Analysis options')
    },
    endpoint: '/cn/analyze',
    method: 'POST'
  },

  // ─── WATER QUALITY ─────────────────────────────────────────────────
  {
    name: 'get_water_quality',
    description: `Get water quality impairment data for a location from the EPA ATTAINS database. Returns information about impaired waterbodies (303(d) listed), pollutants of concern, designated uses, and assessment status. Includes downstream trace to find the nearest receiving water. Use this tool when someone asks about water quality, pollution, impaired streams/rivers, Clean Water Act compliance, NPDES permits, or stormwater discharge concerns for a location.`,
    parameters: {
      location: z.any().describe('GeoJSON Point or Polygon geometry for the area of interest'),
      options: z.object({
        includeDownstream: z.boolean().optional().describe('Trace downstream to find receiving water (default: true)'),
        radiusKm: z.number().optional().describe('Search radius in km (default: 5)')
      }).optional()
    },
    endpoint: '/water-quality/receiving-water',
    method: 'POST'
  },
  {
    name: 'get_water_impairments',
    description: `Quick check for water quality impairments by HUC-12 watershed code. Returns 303(d) listed impaired waterbodies and their pollutants within the specified HUC-12 watershed. Faster than get_water_quality when you already know the HUC-12 code.`,
    parameters: {
      huc12: z.string().describe('12-digit HUC watershed code')
    },
    endpoint: '/water-quality/impairments',
    method: 'GET'
  },

  // ─── ELEVATION & TERRAIN ──────────────────────────────────────────
  {
    name: 'get_elevation_stats',
    description: `Get elevation statistics (min, max, mean, range) for a bounding box area using USGS 3DEP elevation data. Available at 1m, 10m, and 30m resolution. Use this tool when someone asks about terrain, elevation, topography, or relief for an area. Good for understanding whether a site is flat or hilly.`,
    parameters: {
      bbox: z.string().describe('Bounding box as "west,south,east,north" in WGS84 coordinates')
    },
    endpoint: '/spatial/dem-stats',
    method: 'GET'
  },
  {
    name: 'get_contour_lines',
    description: `Generate elevation contour lines for a bounding box area from USGS 3DEP data. Returns GeoJSON contour lines at specified elevation intervals. Use this tool when someone needs topographic contours for site grading, drainage design, or understanding terrain. Available at 1-foot or custom intervals.`,
    parameters: {
      bbox: z.string().describe('Bounding box as "west,south,east,north" in WGS84 coordinates'),
      interval: z.number().optional().describe('Contour interval in feet (default: 2)')
    },
    endpoint: '/spatial/contours',
    method: 'GET'
  },
  {
    name: 'export_dem',
    description: `Export a Digital Elevation Model (DEM) as a GeoTIFF file for a polygon area. Supports 1m, 10m, and 30m USGS 3DEP resolution. The GeoTIFF can be used in GIS software (ArcGIS, QGIS) or hydrologic models. Use this tool when someone needs elevation data for modeling or GIS analysis.`,
    parameters: {
      polygon: z.any().describe('GeoJSON Polygon geometry'),
      resolution: z.enum(['1m', '10m', '30m']).optional().describe('DEM resolution (default: 10m)'),
      targetCrs: z.string().optional().describe('Target coordinate reference system (e.g., "EPSG:2277")'),
      convertToFeet: z.boolean().optional().describe('Convert elevation values to feet (default: false)')
    },
    endpoint: '/spatial/dem-export',
    method: 'POST'
  },

  // ─── LAND USE / LAND COVER ─────────────────────────────────────────
  {
    name: 'export_land_use',
    description: `Export NLCD (National Land Cover Database) land use / land cover data for a polygon area. Returns either a GeoTIFF raster or polygonized vector features with NLCD classification codes. NLCD categories include: Open Water, Developed (4 intensities), Barren Land, Forest (3 types), Shrubland, Herbaceous, Planted/Cultivated, Wetlands (2 types). Use this tool when someone asks about land use, land cover, impervious surface, or development intensity for an area.`,
    parameters: {
      polygon: z.any().describe('GeoJSON Polygon geometry'),
      format: z.enum(['geotiff', 'polygons']).optional().describe('Output format (default: geotiff)')
    },
    endpoint: '/spatial/nlcd-export',
    method: 'POST'
  },

  // ─── MONITORING STATIONS ──────────────────────────────────────────
  {
    name: 'find_monitoring_stations',
    description: `Search for environmental monitoring stations (USGS streamgages, groundwater wells, NOAA weather stations, NOAA tide gauges, water quality stations) near a location or within a bounding box. Returns station IDs, locations, types, and current status. Use this tool when someone asks about stream gauges, weather stations, water level monitoring, or real-time environmental data collection points near a location.`,
    parameters: {
      bbox: z.string().optional().describe('Bounding box as "west,south,east,north"'),
      source: z.string().optional().describe('Data source filter (e.g., "usgs", "noaa")'),
      type: z.string().optional().describe('Station type filter (e.g., "streamgage", "groundwater", "tide")'),
      state: z.string().optional().describe('US state code (e.g., "TX", "CA")'),
      limit: z.number().optional().describe('Maximum number of stations to return')
    },
    endpoint: '/stations',
    method: 'GET'
  },
  {
    name: 'search_stations',
    description: `Search for monitoring stations by name or station ID. Use this tool when someone knows a specific station name or ID and wants to find it. Searches across USGS, NOAA, and other monitoring networks.`,
    parameters: {
      q: z.string().describe('Search query (station name or ID)'),
      type: z.string().optional().describe('Station type filter'),
      limit: z.number().optional().describe('Maximum results (default: 20)')
    },
    endpoint: '/stations/search',
    method: 'GET'
  },

  // ─── GAGE INTELLIGENCE ─────────────────────────────────────────────
  {
    name: 'get_flood_frequency_analysis',
    description: `Perform Bulletin 17C flood frequency analysis for a USGS streamgage. Returns estimated peak flows for various return periods (2, 5, 10, 25, 50, 100, 200, 500 year) based on the station's historical annual peak flow record. Bulletin 17C is the federal standard method for flood frequency analysis in the US. Use this tool when someone needs statistical flood estimates at a gauged location.`,
    parameters: {
      siteId: z.string().describe('USGS station ID (e.g., "08158000" for Colorado River at Austin)'),
      minYears: z.number().optional().describe('Minimum years of record required (default: 10)')
    },
    endpoint: '/gage-intelligence/{siteId}/flood-frequency',
    method: 'GET'
  },
  {
    name: 'get_storm_events',
    description: `Detect and analyze individual storm events from a USGS streamgage's flow record. Returns identified storm events with peak flow, volume, duration, rise rate, and recession characteristics. Use this tool when someone wants to analyze historical storm response at a gauge, calibrate a hydrologic model, or understand how a watershed responds to rainfall.`,
    parameters: {
      siteId: z.string().describe('USGS station ID'),
      period: z.string().optional().describe('Time period (e.g., "1y", "5y", "10y"). Default: 1y'),
      minPeak: z.number().optional().describe('Minimum peak flow threshold in cfs')
    },
    endpoint: '/gage-intelligence/{siteId}/storm-events',
    method: 'GET'
  },

  // ─── SITE ANALYSIS & REPORTS ───────────────────────────────────────
  {
    name: 'generate_site_analysis',
    description: `Generate a comprehensive environmental site analysis report for a project area. Queries all available data sources and produces a detailed report covering flood risk, wetlands, soils, geology, water quality, endangered species, hazardous sites, and regulatory constraints. Use this tool when someone asks for a full environmental assessment, site analysis, due diligence report, or constraint analysis for a development project, real estate transaction, or environmental review.`,
    parameters: {
      geometry: z.any().describe('GeoJSON geometry (Point or Polygon) for the project site'),
      projectName: z.string().optional().describe('Project name for the report'),
      clientName: z.string().optional().describe('Client name for the report')
    },
    endpoint: '/site-analysis/report',
    method: 'POST'
  },
  {
    name: 'generate_constraints_report',
    description: `Generate an environmental constraints report for a development site. Identifies regulatory constraints (flood zones, wetlands, endangered species, contamination) and provides a risk assessment. Use this tool when a developer, engineer, or real estate professional needs to understand what environmental constraints may affect a site. Returns constraint severity levels and regulatory implications.`,
    parameters: {
      geometry: z.any().describe('GeoJSON geometry (Point or Polygon) for the site'),
      projectName: z.string().optional().describe('Project name'),
      clientName: z.string().optional().describe('Client name'),
      options: z.any().optional().describe('Report options (layers to include, detail level)')
    },
    endpoint: '/constraints/report',
    method: 'POST'
  },
  {
    name: 'generate_developability_report',
    description: `Generate a site developability assessment report. Evaluates how suitable a site is for development based on environmental constraints, soil conditions, flood risk, topography, and regulatory requirements. Returns a developability score and detailed findings. Use this tool when someone asks "can I build on this site?" or needs a feasibility assessment for a property.`,
    parameters: {
      geometry: z.any().describe('GeoJSON geometry for the site'),
      projectName: z.string().optional().describe('Project name'),
      options: z.any().optional().describe('Assessment options')
    },
    endpoint: '/site-developability/report',
    method: 'POST'
  },

  // ─── EXPORT ────────────────────────────────────────────────────────
  {
    name: 'export_data',
    description: `Export environmental data layers to common GIS formats (GeoJSON, Shapefile, KML, CSV, GeoPackage). Use this tool when someone needs to download data for use in GIS software, CAD, or other analysis tools. Supports exporting any combination of data layers for a given area.`,
    parameters: {
      layers: z.array(z.string()).optional().describe('Layer names to export'),
      format: z.enum(['geojson', 'shapefile', 'kml', 'csv', 'geopackage']).describe('Output format'),
      crs: z.string().optional().describe('Target coordinate reference system (e.g., "EPSG:4326")'),
      geometry: z.any().optional().describe('GeoJSON geometry to clip export area')
    },
    endpoint: '/export',
    method: 'POST'
  },

  // ─── GEOCODING ─────────────────────────────────────────────────────
  {
    name: 'geocode_address',
    description: `Convert a US address or place name to geographic coordinates (latitude/longitude). Use this tool first when someone provides an address, city name, or place name and you need coordinates to query other GeoTap tools. Returns lat/lng coordinates and a standardized address.`,
    parameters: {
      q: z.string().describe('Address or place name to geocode (e.g., "123 Main St, Austin TX" or "Lake Travis")')
    },
    endpoint: '/geocode',
    method: 'GET'
  },

  // ─── HEALTH & STATUS ──────────────────────────────────────────────
  {
    name: 'check_api_status',
    description: `Check the health and status of the GeoTap API and all connected federal data sources. Returns connectivity status for each external API (FEMA, USGS, EPA, NOAA, etc.). Use this tool to verify which data sources are currently available before making queries.`,
    parameters: {},
    endpoint: '/status',
    method: 'GET'
  },

  // ─── FEMA FIRM PANELS ─────────────────────────────────────────────
  {
    name: 'get_firm_panels',
    description: `Get FEMA Flood Insurance Rate Map (FIRM) panel numbers for an area. FIRM panels are the official flood maps used for flood insurance and floodplain regulation. Returns panel IDs that can be used to download the official FIRM map PDFs. Use this tool when someone needs official FEMA flood map panel numbers or wants to download FIRM maps.`,
    parameters: {
      bbox: z.string().describe('Bounding box as "west,south,east,north" in WGS84 coordinates')
    },
    endpoint: '/spatial/firm-panels',
    method: 'GET'
  },

  // ─── HUC WATERSHEDS ───────────────────────────────────────────────
  {
    name: 'get_huc_watersheds',
    description: `Get Hydrologic Unit Code (HUC) watershed boundaries for a bounding box area. Returns watershed polygons at HUC-8, HUC-10, or HUC-12 level. HUC watersheds are the standard geographic units for water resource management in the US. Use this tool when someone asks about watershed boundaries, HUC codes, or needs to identify which watershed a location is in.`,
    parameters: {
      bbox: z.string().describe('Bounding box as "west,south,east,north"'),
      hucLevel: z.enum(['8', '10', '12']).optional().describe('HUC level: 8 (subbasin), 10 (watershed), or 12 (subwatershed). Default: 12')
    },
    endpoint: '/stations/watersheds',
    method: 'GET'
  },

  // ─── SATELLITE IMAGERY ────────────────────────────────────────────
  {
    name: 'export_satellite_imagery',
    description: `Export satellite imagery as a GeoTIFF for a polygon area. Available at high, medium, and low resolution from USGS/NAIP aerial photography. Use this tool when someone needs aerial or satellite photos of a site for GIS analysis, site documentation, or visual assessment.`,
    parameters: {
      polygon: z.any().describe('GeoJSON Polygon geometry'),
      resolution: z.enum(['high', 'medium', 'low']).optional().describe('Image resolution (default: medium)'),
      targetCrs: z.string().optional().describe('Target coordinate reference system')
    },
    endpoint: '/spatial/satellite-export',
    method: 'POST'
  }
];
