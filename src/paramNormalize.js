/**
 * Parameter Normalization for MCP Tools
 *
 * Fixes the #1 LLM error pattern: inconsistent coordinate parameter naming.
 * The backend has 3 conventions: lat/lng, lat/lon, latitude/longitude.
 * This normalizer accepts ANY variant from the LLM and converts to what
 * each specific endpoint expects.
 *
 * Also handles:
 * - Default geometry="none" for MCP consumers (prevents context blow-up)
 * - Removal of undefined/null optional params
 */

/**
 * Per-tool coordinate format expected by the backend.
 * 'lat_lng' = { lat, lng }
 * 'lat_lon' = { lat, lon }
 * 'latitude_longitude' = { latitude, longitude }
 */
const COORD_FORMAT = {
  // lat/lng tools
  identify_features_at_point: 'lat_lng',
  get_environmental_data_near_point: 'lat_lng',
  delineate_watershed: 'lat_lng',
  get_watershed_characteristics: 'lat_lng',
  get_flow_statistics: 'lat_lng',
  find_similar_watersheds: 'lat_lng',
  find_similar_watersheds_with_stats: 'lat_lng',
  recommend_index_gage: 'lat_lng',
  transfer_flood_statistics: 'lat_lng',

  // lat/lon tools
  get_rainfall_data: 'lat_lon',
  get_idf_curves: 'lat_lon',
  get_rainfall_distribution: 'lat_lon',
  get_climate_change_factors: 'lat_lon',
  get_rainfall_uncertainty_bounds: 'lat_lon',
  get_hydrology_distribution_for_location: 'lat_lon',
  get_watershed_for_point: 'lat_lon',

  // latitude/longitude tools
  generate_hyetograph: 'latitude_longitude',
  export_hyetograph: 'latitude_longitude',
  get_climate_change_rainfall_projection: 'latitude_longitude',
  generate_uncertainty_envelope: 'latitude_longitude',
  run_rainfall_sensitivity_analysis: 'latitude_longitude',
};

/**
 * Tools that support a `geometry` parameter for controlling response size.
 * For MCP consumers, default to "none" to prevent context window overflow.
 */
const GEOMETRY_PARAM_TOOLS = new Set([
  'get_environmental_data_for_area',
  'get_environmental_data_near_point',
  'get_environmental_data_in_bbox',
  'get_layer_features',
]);

/**
 * Normalize parameters for a tool call.
 *
 * 1. Converts any lat/lng/lon/latitude/longitude variant to what the backend expects
 * 2. Defaults geometry="none" for tools that support it (MCP context protection)
 * 3. Strips undefined/null optional params
 *
 * @param {string} toolName - The legacy tool name (after action routing for consolidated tools)
 * @param {object} params - Raw parameters from the LLM
 * @returns {object} Normalized parameters
 */
export function normalizeParams(toolName, params) {
  if (!params || typeof params !== 'object') return params;

  let p = { ...params };

  // ── 1. Coordinate normalization ──────────────────────────────────
  const format = COORD_FORMAT[toolName];
  if (format) {
    // Extract lat from any variant
    const lat = p.lat ?? p.latitude;
    // Extract lng from any variant
    const lng = p.lng ?? p.lon ?? p.longitude;

    // Remove all coordinate variants
    delete p.lat;
    delete p.latitude;
    delete p.lng;
    delete p.lon;
    delete p.longitude;

    // Set the correct format if we have values
    if (lat !== undefined && lng !== undefined) {
      switch (format) {
        case 'lat_lng':
          p.lat = Number(lat);
          p.lng = Number(lng);
          break;
        case 'lat_lon':
          p.lat = Number(lat);
          p.lon = Number(lng);
          break;
        case 'latitude_longitude':
          p.latitude = Number(lat);
          p.longitude = Number(lng);
          break;
      }
    }
  }

  // ── 2. Default geometry="none" for MCP ───────────────────────────
  if (GEOMETRY_PARAM_TOOLS.has(toolName) && p.geometry === undefined) {
    p.geometry = 'none';
  }

  // ── 3. Ungaged estimation: map `parameters` → `basinCharacteristics` ──
  // The MCP tool accepts friendly names (drainageArea, meanBasinSlope)
  // but the backend NSS API expects USGS codes (DRNAREA, BSLDEM)
  if (toolName === 'estimate_ungaged_flood_frequency' ||
      toolName === 'estimate_all_ungaged_statistics') {
    const paramObj = p.parameters || p.characteristics || {};
    if (Object.keys(paramObj).length > 0) {
      // Map friendly names → USGS NSS parameter codes
      const PARAM_MAP = {
        drainageArea: 'DRNAREA',
        contributingDrainageArea: 'CONTDA',
        meanAnnualPrecipitation: 'PRECIP',
        meanBasinSlope: 'BSLDEM',
        percentForest: 'FOREST',
        percentStorage: 'STORAGE',
        percentImpervious: 'IMPERV',
        meanBasinElevation: 'ELEV',
        basinLength: 'BSHAPE',
        annualRunoff: 'RUNOFF',
      };

      const basinChars = {};
      for (const [key, value] of Object.entries(paramObj)) {
        // Use mapped name if available, otherwise pass through as-is
        // (allows users to send DRNAREA directly too)
        const mappedKey = PARAM_MAP[key] || key;
        basinChars[mappedKey] = Number(value);
      }

      p.basinCharacteristics = basinChars;
      delete p.parameters;
      delete p.characteristics;
    }
  }

  // Also map for find_similar tools
  if (toolName === 'find_similar_watersheds' ||
      toolName === 'find_similar_watersheds_with_stats') {
    const charObj = p.characteristics || p.parameters || {};
    if (Object.keys(charObj).length > 0) {
      const PARAM_MAP = {
        drainageArea: 'DRNAREA',
        contributingDrainageArea: 'CONTDA',
        meanAnnualPrecipitation: 'PRECIP',
        meanBasinSlope: 'BSLDEM',
        percentForest: 'FOREST',
      };

      const mapped = {};
      for (const [key, value] of Object.entries(charObj)) {
        const mappedKey = PARAM_MAP[key] || key;
        mapped[mappedKey] = Number(value);
      }
      p.basinCharacteristics = mapped;
      delete p.characteristics;
      delete p.parameters;
    }
  }

  // ── 4. Strip undefined/null optional params ──────────────────────
  for (const [key, value] of Object.entries(p)) {
    if (value === undefined || value === null) {
      delete p[key];
    }
  }

  return p;
}
