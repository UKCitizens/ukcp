/**
 * @file src/lib/geoOrigin.js
 * @description Builds a post origin object from the current geo selection.
 *
 * geo_scope GSS fields will be null for geo entity posts -- React state does not
 * carry raw GSS codes for country/region/county/constituency/ward. The server
 * geo_scope validation is relaxed in v0.1 (entity_type + entity_id is the anchor).
 */

export function buildGeoOrigin(locationType, locationSlug, geoData) {
  if (!locationType || !locationSlug) return null
  return {
    entity_type: locationType,
    entity_id:   locationSlug,
    entity_name: geoData?.name ?? locationSlug,
    geo_scope: {
      ward_gss:         locationType === 'ward'         ? (geoData?.gss ?? null) : null,
      constituency_gss: locationType === 'constituency' ? (geoData?.gss ?? null) : null,
      county_gss:       locationType === 'county'       ? (geoData?.gss ?? null) : null,
      region:           locationType === 'region'       ? locationSlug : null,
      country:          locationType === 'country'      ? locationSlug : null,
    },
  }
}
