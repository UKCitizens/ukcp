/**
 * @file services/groupResolver.js
 * @description Derives a user's systemic group membership from their home
 * geography and merges with exception overrides from geo_group_state.
 *
 * group_key format:
 *   ward:{ward_gss}         -- civic tier
 *   constituency:{con_gss}  -- civic tier
 *   town:{place_id}         -- place tier (MongoDB _id string)
 *   county:{slug}           -- place tier (name lowercased, spaces->hyphens)
 *   region:{slug}           -- place tier
 *   country:{slug}          -- place tier
 *
 * State values: 'Member' | 'Viewer' | 'None'
 *   Member  -- default; no exception row stored.
 *   Viewer  -- sees content, not a participant; exception row stored.
 *   None    -- hidden from feed; exception row stored.
 *             For civic groups (ward/constituency) None is an experience mute
 *             only -- the citizen retains democratic standing (quorum, voting
 *             eligibility). This is a display preference, not a membership
 *             withdrawal.
 *
 * Only Viewer and None are persisted in geo_group_state.
 * Resetting to Member deletes the exception row.
 */

import { geoGroupStateCol, geoGroupsCol, groupMembershipsCol } from '../db/mongo.js'

const slugify = s => s.toLowerCase().replace(/\s+/g, '-')

/**
 * Build the ordered list of systemic groups from a user document.
 * Returns an empty array if no home geography is set.
 * Does not consult geo_group_state -- pure derivation from user fields.
 *
 * @param {object} user
 * @returns {Array<{ group_key, tier, register, label }>}
 */
export function buildSystemicGroups(user) {
  const groups = []

  if (user.home_ward_gss && user.home_ward) {
    groups.push({
      group_key: `ward:${user.home_ward_gss}`,
      tier:      'ward',
      register:  'civic',
      label:     user.home_ward,
    })
  }
  if (user.home_constituency_gss && user.home_constituency) {
    groups.push({
      group_key: `constituency:${user.home_constituency_gss}`,
      tier:      'constituency',
      register:  'civic',
      label:     user.home_constituency,
    })
  }
  if (user.home_place_id && user.home_place_name) {
    groups.push({
      group_key: `place:${user.home_place_id}`,
      tier:      (user.home_place_type ?? 'town'),
      register:  'place',
      label:     user.home_place_name,
    })
  }
  if (user.home_county) {
    groups.push({
      group_key: `county:${slugify(user.home_county)}`,
      tier:      'county',
      register:  'place',
      label:     user.home_county,
    })
  }
  if (user.home_region) {
    groups.push({
      group_key: `region:${slugify(user.home_region)}`,
      tier:      'region',
      register:  'place',
      label:     user.home_region,
    })
  }
  if (user.home_country) {
    groups.push({
      group_key: `country:${slugify(user.home_country)}`,
      tier:      'country',
      register:  'place',
      label:     user.home_country,
    })
  }

  return groups
}

/**
 * Resolve systemic groups with their current state for a user.
 * Fetches exception overrides from geo_group_state and merges with defaults.
 *
 * @param {object} user -- MongoDB user document (must include _id and home_* fields)
 * @returns {Promise<{ civic: Array, place: Array }>}
 *   Each item: { group_key, tier, register, label, state }
 */
export async function resolveUserGroups(user) {
  const groups = buildSystemicGroups(user)
  if (!groups.length) return { civic: [], place: [] }

  const col = geoGroupStateCol()
  const exceptions = col
    ? await col.find({ user_id: user._id }).toArray()
    : []

  const exMap = new Map(exceptions.map(e => [e.group_key, e.state]))

  const withState = groups.map(g => ({
    ...g,
    state: exMap.get(g.group_key) ?? 'Member',
  }))

  return {
    civic: withState.filter(g => g.register === 'civic'),
    place: withState.filter(g => g.register === 'place'),
  }
}

/**
 * Ensure a user has constituted membership records for all their derived geo groups.
 * Called after PATCH /api/profile/geography.
 *
 * For each tier: upserts the geo_group entity (handles wards not yet in the seed)
 * and upserts a group_memberships record with enrolment='constituted'.
 *
 * Keyed on { user_id, collection_type:'geo_groups', group_key } -- safe to call
 * repeatedly; subsequent calls update updated_at only.
 *
 * @param {ObjectId} userId
 * @param {object}   geo   -- the home_* fields from the PATCH body
 */
export async function ensureGeoMemberships(userId, geo) {
  const ggCol  = geoGroupsCol()
  const memCol = groupMembershipsCol()
  if (!ggCol || !memCol) return

  const targets = []

  if (geo.home_ward_gss && geo.home_ward) {
    targets.push({ group_key: `ward:${geo.home_ward_gss}`, tier: 'ward',          geo_type: 'civic',  label: geo.home_ward,         gss: geo.home_ward_gss })
  }
  if (geo.home_constituency_gss && geo.home_constituency) {
    targets.push({ group_key: `constituency:${geo.home_constituency_gss}`, tier: 'constituency', geo_type: 'civic', label: geo.home_constituency, gss: geo.home_constituency_gss })
  }
  if (geo.home_place_id && geo.home_place_name) {
    targets.push({ group_key: `place:${geo.home_place_id}`, tier: 'place',         geo_type: 'place',  label: geo.home_place_name,   gss: null })
  }
  if (geo.home_county) {
    targets.push({ group_key: `county:${slugify(geo.home_county)}`,   tier: 'county',        geo_type: 'place',  label: geo.home_county,       gss: null })
  }
  if (geo.home_region) {
    targets.push({ group_key: `region:${slugify(geo.home_region)}`,   tier: 'region',        geo_type: 'place',  label: geo.home_region,       gss: null })
  }
  if (geo.home_country) {
    targets.push({ group_key: `country:${slugify(geo.home_country)}`, tier: 'country',       geo_type: 'place',  label: geo.home_country,      gss: null })
  }
  // Nation (UK) is always included -- every registered user is a member
  targets.push({ group_key: 'nation:uk', tier: 'nation', geo_type: 'place', label: 'United Kingdom', gss: 'K02000001' })

  const now = new Date()

  for (const t of targets) {
    // Ensure the geo_group entity exists (handles wards not yet in the seed)
    await ggCol.updateOne(
      { group_key: t.group_key },
      {
        $set:         { tier: t.tier, label: t.label, geo_type: t.geo_type, gss: t.gss, origin: 'systemic' },
        $setOnInsert: { group_key: t.group_key, created_at: now },
      },
      { upsert: true }
    )

    // Upsert constituted membership record
    await memCol.updateOne(
      { user_id: userId, collection_type: 'geo_groups', group_key: t.group_key },
      {
        $set: {
          user_id:         userId,
          collection_type: 'geo_groups',
          group_key:       t.group_key,
          tier:            t.tier,
          membership_role: 'member',
          enrolment:       'constituted',
          status:          'active',
          updated_at:      now,
        },
        $setOnInsert: { joined_at: now },
      },
      { upsert: true }
    )
  }
}
