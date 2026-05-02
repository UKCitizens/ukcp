/**
 * @file Locations.jsx
 * @description Locations page. Owns all navigation, selection, and walker state.
 *
 * View modes:
 *   browse  — minimised layout (L/mid/R columns all visible). Default state.
 *
 *   explore — maximised layout (header/footer collapse, mid pane fills frame).
 *             Toggled manually via the expand arrow in MidPaneTabs.
 *
 * viewMode and midTab are independent:
 *   viewMode drives the layout CSS class (mapExpand).
 *   midTab drives which content panel is rendered on top.
 *   They are set explicitly by each action handler — no implicit auto-switching.
 *
 * Walker behaviour:
 *   - Auto-closes when county depth is reached (path.length >= 3).
 *   - Re-opens when user crumbs back to region or above (goTo index < 2).
 *   - Re-opens on full reset.
 *
 * Crumb trail:
 *   - Always visible when path has entries (independent of walkerOpen).
 *   - Nav crumbs are clickable (call wrapped goTo).
 *   - Last nav crumb (current position) is display-only.
 *   - Selected place appended as display-only: "Name (Type)".
 *   - Place crumb cleared on any backward navigation.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useUserState } from '../context/UserStateContext.jsx'

const API_BASE   = import.meta.env.VITE_API_URL ?? ''
const SAVES_KEY  = 'ukcp_saves'

// Display labels for known network slugs. Add an entry per new network.
const NETWORK_LABELS = {
  'at-the-school-gates': 'School Gates',
}
import PageLayout from '../components/PageLayout.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import PlacesCard from '../components/PlacesCard.jsx'
import ConstituencyPane from '../components/ConstituencyPane.jsx'
import MidPaneMap from '../components/MidPaneMap.jsx'
import MidPaneTabs from '../components/MidPaneTabs.jsx'
import LocationInfo from '../components/LocationInfo.jsx'
import Footer from '../components/Layout/Footer.jsx'
import { useLocationData } from '../hooks/useLocationData.js'
import { useNavigation } from '../hooks/useNavigation.js'
import { usePlacesFilter } from '../hooks/usePlacesFilter.js'
import { useSelectionState } from '../hooks/useSelectionState.js'
import { useLocationContent } from '../hooks/useLocationContent.js'
import { usePopulation } from '../hooks/usePopulation.js'
import { useSessionSnapshot } from '../hooks/useSessionSnapshot.js'
import { NAV_COORDS } from '../config/navCoords.js'
import { findRelatedPlace } from '../utils/findRelatedPlace.js'
import { NewsStub, LocalTradersStub } from '../components/TabStubs.jsx'
import GroupsTab    from '../components/Groups/GroupsTab.jsx'
import CommitteeTab from '../components/Committee/CommitteeTab.jsx'
import GroupsLeftNav   from '../components/TabNavs/GroupsLeftNav.jsx'
import GroupsRightNav  from '../components/TabNavs/GroupsRightNav.jsx'
import NewsLeftNav     from '../components/TabNavs/NewsLeftNav.jsx'
import NewsRightNav    from '../components/TabNavs/NewsRightNav.jsx'
import TradersLeftNav  from '../components/TabNavs/TradersLeftNav.jsx'
import TradersRightNav from '../components/TabNavs/TradersRightNav.jsx'
import CivicLeftNav    from '../components/TabNavs/CivicLeftNav.jsx'
import CivicRightNav   from '../components/TabNavs/CivicRightNav.jsx'
import SchoolsLeftNav     from '../components/SchoolGates/SchoolsLeftNav.jsx'
import SchoolGatesMid     from '../components/SchoolGates/SchoolGatesMid.jsx'
import SchoolsRightNav    from '../components/SchoolGates/SchoolsRightNav.jsx'

export default function Locations() {
  const { session, loading: authLoading, profile } = useAuth()
  const { updateUserState } = useUserState()
  const { places, wards, hierarchy, containment, loading } = useLocationData()
  const { path, panel1, panel2, select, selectMany, goTo, reset } = useNavigation(hierarchy)
  const { grouped, scopeKey } = usePlacesFilter(places, path)
  const {
    pendingPlace,
    setPending,
    dismissPending,
  } = useSelectionState()

  const [groupsFilter,       setGroupsFilter]       = useState('all')
  const [activeNetwork,      setActiveNetwork]      = useState(null)
  const [selectedSchoolUrns, setSelectedSchoolUrns] = useState([])
  const [focusSchoolUrn,     setFocusSchoolUrn]     = useState(null)
  const [loadedSchools,      setLoadedSchools]      = useState([])
  const [tabNavMode,         setTabNavMode]         = useState(false)  // false = location nav, true = tab-specific nav
  const [walkerOpen,        setWalkerOpen]        = useState(true)
  const [midTab,            setMidTab]            = useState('map')
  const [viewMode,          setViewMode]          = useState('browse')  // 'browse' | 'explore'
  const [flyTo,             setFlyTo]             = useState(null)
  const [invalidateTrigger, setInvalidateTrigger] = useState(0)
  const [walkerMode, setWalkerMode] = useState(false)  // left pane walker mode
  const [rightWalkerMode,     setRightWalkerMode]     = useState(false)
  const [pendingConstituency, setPendingConstituency] = useState(null)
  const [pendingWard,         setPendingWard]         = useState(null)

  // ── Session snapshot ─────────────────────────────────────────────────────
  // Persists app state across reloads. Logged-in → user_session collection.
  // Anon → localStorage. Restore fires once after auth resolves.
  const snapshot = useMemo(() => ({
    geo_path:            path,
    active_tab:          midTab,
    active_network:      activeNetwork,
    selected_school_urn: focusSchoolUrn,
    tab_nav_mode:        tabNavMode,
    group_filter:        groupsFilter,
  }), [path, midTab, activeNetwork, focusSchoolUrn, tabNavMode, groupsFilter])

  // snapHasData tracks whether the snapshot restore actually populated state.
  // If false after snapshotReady flips, profile.preferences is used as a
  // fallback so first-time users land on their preferred default tab.
  const [snapHasData, setSnapHasData] = useState(false)

  const handleRestore = useCallback((snap) => {
    if (!snap) return
    setSnapHasData(true)
    if (Array.isArray(snap.geo_path) && snap.geo_path.length) {
      selectMany(snap.geo_path)
    }
    if (snap.active_tab)                          setMidTab(snap.active_tab)
    if (snap.active_network)                      setActiveNetwork(snap.active_network)
    if (snap.selected_school_urn)                 setFocusSchoolUrn(snap.selected_school_urn)
    if (typeof snap.tab_nav_mode === 'boolean')   setTabNavMode(snap.tab_nav_mode)
    if (snap.group_filter)                        setGroupsFilter(snap.group_filter)
  }, [selectMany])

  const { ready: snapshotReady } = useSessionSnapshot({
    session, loading: authLoading, snapshot, onRestore: handleRestore,
  })

  // Preferences fallback: only when no snapshot data restored.
  // Runs once after snapshotReady so it can't fight the snapshot.
  const prefsAppliedRef = useRef(false)
  useEffect(() => {
    if (!snapshotReady || prefsAppliedRef.current) return
    if (snapHasData) { prefsAppliedRef.current = true; return }
    const prefs = profile?.user?.preferences
    if (prefs?.default_tab) {
      setMidTab(prefs.default_tab)
      prefsAppliedRef.current = true
    }
  }, [snapshotReady, snapHasData, profile?.user?.preferences])

  // ── School follows hydration ──────────────────────────────────────────────
  // On auth resolve, populate selectedSchoolUrns from user_follows (logged-in)
  // or ukcp_saves localStorage (anon). Runs once per auth state.
  const followsHydrated = useRef(false)
  useEffect(() => {
    if (authLoading) return
    if (followsHydrated.current) return
    followsHydrated.current = true

    if (session?.access_token) {
      fetch(`${API_BASE}/api/follows?entity_type=school`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.ok ? r.json() : [])
        .then(rows => setSelectedSchoolUrns(rows.map(r => r.entity_id)))
        .catch(() => {})
    } else {
      try {
        const saves = JSON.parse(localStorage.getItem(SAVES_KEY) ?? '[]')
        setSelectedSchoolUrns(
          saves.filter(s => s.entity_type === 'school').map(s => s.entity_id)
        )
      } catch {}
    }
  }, [authLoading, session?.access_token])

  // ── Identity strip context ────────────────────────────────────────────────
  // Surfaces current scope and network mode to the header strip.
  useEffect(() => {
    const last = path[path.length - 1]
    updateUserState({
      scope:   last ? last.value : 'UK',
      network: activeNetwork ? (NETWORK_LABELS[activeNetwork] ?? '') : '',
    })
  }, [path, activeNetwork, updateUserState])

  // Zoom levels that mirror MiniMap.jsx ZOOM_BY_TYPE — used to compute flyTo zoom.
  const MINI_ZOOM = { hamlet: 14, village: 13, town: 12, city: 11, ward: 12, constituency: 10, county: 9, region: 7, country: 5 }

  // After the layout transition (0.3s) fires when viewMode changes, tell Leaflet
  // the container resized. Fires on both browse→explore and explore→browse.
  useEffect(() => {
    const t = setTimeout(() => setInvalidateTrigger(n => n + 1), 350)
    return () => clearTimeout(t)
  }, [viewMode])

  function handleWalkerToggle() {
    setWalkerOpen(open => !open)
  }

  // ── Browse-mode handlers (location nav) ────────────────────────────────
  // Walker option click — stay in browse mode, preserve current tab.
  function handleNavSelect(level, value) {
    dismissPending()
    setPendingConstituency(null)
    setPendingWard(null)
    setRightWalkerMode(false)
    select(level, value)
  }

  // Tab change — info tab always forces browse mode (info never shows expanded).
  function handleTabChange(tab) {
    setMidTab(tab)
  }

  // Expand/collapse toggle — driven by the arrow button in MidPaneTabs.
  function handleToggleExpand() {
    setViewMode(v => v === 'explore' ? 'browse' : 'explore')
  }

  // Crumb click — go back to a nav level. Stay in browse mode; preserve midTab
  // so "back" from info stays on info, back from map stays on map.
  const handleGoTo = useCallback((index) => {
    goTo(index)
    dismissPending()
    setPendingConstituency(null)
    setPendingWard(null)
    setRightWalkerMode(false)
    setWalkerOpen(true)
  }, [goTo, dismissPending])

  // Reset to UK root — return to initial browse+map state.
  const handleReset = useCallback(() => {
    reset()
    dismissPending()
    setPendingConstituency(null)
    setPendingWard(null)
    setRightWalkerMode(false)
    setWalkerOpen(true)
    setViewMode('browse')
    setMidTab('map')
  }, [reset, dismissPending])

  // ── Explore-mode handlers (deliberate selection) ────────────────────────

  // Resolve country/region/county ancestors (up to county only) for a constituency name.
  const resolveConstituencyAncestors = useCallback((constituencyName) => {
    if (!wards || !constituencyName) return []
    const norm = constituencyName.trim().toLowerCase()
    const hit  = wards.find(w => w.constituency?.trim().toLowerCase() === norm)
    if (!hit) return []
    const pairs = []
    if (hit.country)   pairs.push({ level: 'country', value: hit.country })
    if (hit.region)    pairs.push({ level: 'region',  value: hit.region })
    if (hit.ctyhistnm) pairs.push({ level: 'county',  value: hit.ctyhistnm })
    return pairs
  }, [wards])

  // Resolve county ancestry and constituency name for a ward.
  const resolveWardAncestors = useCallback((wardName) => {
    if (!wards || !wardName) return { constituency: null, countyPairs: [] }
    const norm = wardName.trim().toLowerCase()
    const hit  = wards.find(w => w.ward?.trim().toLowerCase() === norm)
    if (!hit) return { constituency: null, countyPairs: [] }
    const countyPairs = []
    if (hit.country)      countyPairs.push({ level: 'country', value: hit.country })
    if (hit.region)       countyPairs.push({ level: 'region',  value: hit.region })
    if (hit.ctyhistnm)    countyPairs.push({ level: 'county',  value: hit.ctyhistnm })
    return { constituency: hit.constituency ?? null, countyPairs }
  }, [wards])

  // Unified selection handler.
  // country/region/county — nav levels, go straight into path via select().
  // constituency/ward     — content context only; path updated to county scope.
  const handleSelect = useCallback((level, value) => {
    dismissPending()
    setPendingConstituency(null)
    setPendingWard(null)
    if (['country', 'region', 'county'].includes(level)) {
      select(level, value)
    } else if (level === 'ward') {
      const { constituency: wardCon, countyPairs } = resolveWardAncestors(value)
      if (countyPairs.length) selectMany(countyPairs)
      if (wardCon) setPendingConstituency(wardCon)
      setPendingWard(value)
    } else {
      // constituency
      const countyPairs = resolveConstituencyAncestors(value)
      if (countyPairs.length) selectMany(countyPairs)
      setPendingConstituency(value)
    }
  }, [dismissPending, select, selectMany, resolveConstituencyAncestors, resolveWardAncestors])

  const handleSelectMany = useCallback((pairs) => {
    dismissPending()
    const conPair  = pairs.find(p => p.level === 'constituency')
    const wardPair = pairs.find(p => p.level === 'ward')
    const countyPairs = conPair
      ? resolveConstituencyAncestors(conPair.value)
      : wardPair ? resolveWardAncestors(wardPair.value).countyPairs : []
    if (countyPairs.length) selectMany(countyPairs)
    if (conPair)  setPendingConstituency(conPair.value)
    if (wardPair) setPendingWard(wardPair.value)
  }, [dismissPending, selectMany, resolveConstituencyAncestors, resolveWardAncestors])

  // Left pane click — walker mode (All selected) = preview only, no path change.
  // Letter selected = full commit: path updates to county, panes scope.
  const handleLeftPlaceSelect = useCallback((place) => {
    if (walkerMode) {
      setPending(place)
    } else {
      const pairs = []
      if (place.country)   pairs.push({ level: 'country', value: place.country })
      if (place.region)    pairs.push({ level: 'region',  value: place.region })
      if (place.ctyhistnm) pairs.push({ level: 'county',  value: place.ctyhistnm })
      if (pairs.length) selectMany(pairs)
      setPending(place)
    }
  }, [selectMany, setPending, walkerMode])

  // Map/search place selection — always commits regardless of walker mode.
  const handlePlaceSelect = useCallback((place) => {
    const pairs = []
    if (place.country)   pairs.push({ level: 'country', value: place.country })
    if (place.region)    pairs.push({ level: 'region',  value: place.region })
    if (place.ctyhistnm) pairs.push({ level: 'county',  value: place.ctyhistnm })
    if (pairs.length) selectMany(pairs)
    setPending(place)
  }, [selectMany, setPending])

  // Map marker click — routes to the appropriate selection handler.
  // Each handler already sets explore mode.
  const handleMarkerClick = useCallback(({ type, place, name, constituency }) => {
    if (type === 'place') {
      handlePlaceSelect(place)
    } else if (type === 'constituency') {
      handleSelect('constituency', name)
    } else if (type === 'ward') {
      handleSelectMany([
        { level: 'constituency', value: constituency },
        { level: 'ward',         value: name },
      ])
    }
  }, [handlePlaceSelect, handleSelect, handleSelectMany])

  // ── Derived strings ────────────────────────────────────────────────────
  const county        = path.find(p => p.level === 'county')?.value        ?? null
  const region        = path.find(p => p.level === 'region')?.value        ?? null
  const country       = path.find(p => p.level === 'country')?.value       ?? null
  const constituency  = path.find(p => p.level === 'constituency')?.value  ?? null
  const ward          = path.find(p => p.level === 'ward')?.value          ?? null

  // ── Cross-reference: constituency/ward → related place ───────────────────
  // When constituency or ward lands in path, silently check for a matching
  // place in the same county. Exact hit → setPending (gold marker + crumb).
  // Fuzzy hit → silent (place visible in left list, no highlight).
  useEffect(() => {
    const target = ward ?? constituency
    if (!target || !places?.length) return
    const { match, confidence } = findRelatedPlace(target, places, county)
    if (match && confidence === 'exact') setPending(match)
  }, [ward, constituency, county, places, setPending])

  // ── FlyTo — fire when pendingPlace is set (left nav or cross-reference) ───
  useEffect(() => {
    if (!pendingPlace?.lat || !pendingPlace?.lng) return
    const zoom = MINI_ZOOM[pendingPlace.place_type?.toLowerCase()] ?? 12
    setFlyTo({ lat: +pendingPlace.lat, lng: +pendingPlace.lng, zoom })
  }, [pendingPlace])

  // ── Content context — deepest geographic level for Wiki content ─────────
  const contentContext = useMemo(() => {
    if (pendingPlace)          return {
      type:  pendingPlace.place_type.toLowerCase(),
      slug:  pendingPlace.name.replace(/ /g, '_'),
      label: pendingPlace.name,
    }
    if (pendingWard)           return { type: 'ward',          slug: pendingWard.replace(/ /g, '_'),          label: pendingWard          }
    if (pendingConstituency)   return { type: 'constituency',  slug: pendingConstituency.replace(/ /g, '_'),  label: pendingConstituency  }
    if (constituency)          return { type: 'constituency',  slug: constituency.replace(/ /g, '_'),         label: constituency         }
    if (county)                return { type: 'county',        slug: county.replace(/ /g, '_'),               label: county               }
    if (region)                return { type: 'region',        slug: region.replace(/ /g, '_'),               label: region               }
    if (country)               return { type: 'country',       slug: country.replace(/ /g, '_'),              label: country              }
    return { type: 'country', slug: 'United_Kingdom', label: 'United Kingdom' }
  }, [pendingPlace, pendingWard, pendingConstituency, constituency, county, region, country])

  // Ward context — rendered locally in LocationInfo, no API call needed.
  const wardInfo = useMemo(() => {
    if (!ward) return null
    return { ward, constituency, county, region, country }
  }, [ward, constituency, county, region, country])

  const {
    contentType, summary, extract, thumbnail, title, wikiUrl,
    mpName, party, partyColour, population, geoData,
    area, elevation, website, notable_facts, category_tags,
    loading: contentLoading, error: contentError,
  } = useLocationContent(contentContext?.type, contentContext?.slug)

  // locationType — current named place type or geo level, drives tab visibility in MidPaneTabs.
  const locationType = pendingPlace
    ? pendingPlace.place_type?.toLowerCase() ?? null
    : contentContext?.type ?? null

  // If Government tab is active but context switches to a named place, reset to Info.
  const NAMED_PLACES_GUARD = ['city', 'town', 'village', 'hamlet']
  useEffect(() => {
    if (midTab === 'civic' && NAMED_PLACES_GUARD.includes(locationType ?? '')) {
      setMidTab('map')
    }
  }, [locationType])

  // ── GSS codes for Nomis population lookup (ward + constituency) ──────────
  const wardGss = useMemo(() => {
    if (!ward || !wards) return null
    return wards.find(w => w.ward === ward)?.ward_gss ?? null
  }, [ward, wards])

  const conGss = useMemo(() => {
    if (!constituency || !wards) return null
    return wards.find(w => w.constituency === constituency)?.con_gss ?? null
  }, [constituency, wards])

  // Nomis population — active when ward or constituency is selected (places use Wikidata via content hook)
  const { population: gssPopulation } = usePopulation(wardGss ?? conGss)

  // GSS codes for pending ward/constituency (not in path, set via ConstituencyPane selection)
  const pendingWardGss = useMemo(() => {
    if (!pendingWard || !wards) return null
    return wards.find(w => w.ward === pendingWard)?.ward_gss ?? null
  }, [pendingWard, wards])

  const pendingConGss = useMemo(() => {
    if (!pendingConstituency || !wards) return null
    return wards.find(w => w.constituency === pendingConstituency)?.con_gss ?? null
  }, [pendingConstituency, wards])

  // School geo scope — pending values take priority as they are more specific.
  const schoolLocationScope = useMemo(() => {
    if (pendingWardGss) return { scope: 'ward',         gss: pendingWardGss }
    if (wardGss)        return { scope: 'ward',         gss: wardGss }
    if (pendingConGss)  return { scope: 'constituency', gss: pendingConGss }
    if (conGss)         return { scope: 'constituency', gss: conGss }
    return null
  }, [wardGss, conGss, pendingWardGss, pendingConGss])

  // ── Context coordinates for MiniMap ─────────────────────────────────────
  const contextCoords = useMemo(() => {
    if (pendingPlace?.lat && pendingPlace?.lng)
      return { lat: +pendingPlace.lat, lng: +pendingPlace.lng }

    if (pendingConstituency && wards) {
      const needle = pendingConstituency.trim().toLowerCase()
      const rows = wards.filter(w => w.constituency?.trim().toLowerCase() === needle)
                        .filter(w => w.lat && w.lng && !isNaN(+w.lat))
      if (rows.length) return {
        lat: rows.reduce((s, w) => s + +w.lat, 0) / rows.length,
        lng: rows.reduce((s, w) => s + +w.lng, 0) / rows.length,
      }
    }

    if (ward && wards) {
      const hit = wards.find(w => w.ward === ward)
      if (hit?.lat) return { lat: +hit.lat, lng: +hit.lng }
    }
    if (constituency && wards) {
      const rows = wards.filter(w => w.constituency === constituency)
                        .filter(w => w.lat && w.lng && !isNaN(+w.lat))
      if (rows.length) return {
        lat: rows.reduce((s, w) => s + +w.lat, 0) / rows.length,
        lng: rows.reduce((s, w) => s + +w.lng, 0) / rows.length,
      }
    }
    if (county)   return NAV_COORDS[county]   ?? null
    if (region)   return NAV_COORDS[region]   ?? null
    if (country)  return NAV_COORDS[country]  ?? null
    return NAV_COORDS['United Kingdom']
  }, [pendingPlace, pendingConstituency, ward, constituency, county, region, country, wards])

  // ── Constituency list and total ward count ──────────────────────────────
  const constituencies = useMemo(() => {
    if (!containment || !county) return []
    const needle = county.trim().toLowerCase()
    const results = []
    for (const [id, entry] of Object.entries(containment)) {
      const match = entry.counties?.find(c => c.ctyhistnm?.trim().toLowerCase() === needle)
      if (match) results.push({ id, name: entry.name, partial: !!match.partial })
    }
    return results.sort((a, b) => a.name.localeCompare(b.name))
  }, [containment, county])

  const totalWards = useMemo(() => {
    if (!hierarchy || !country || !region || !county) return 0
    const countiesNode = hierarchy?.[country]?.regions?.[region]?.counties?.[county]?.constituencies
    if (!countiesNode) return 0
    return Object.values(countiesNode).reduce(
      (sum, c) => sum + Object.keys(c.wards ?? {}).length, 0
    )
  }, [hierarchy, country, region, county])

  // ── Crumb trail ─────────────────────────────────────────────────────────
  const crumbs = useMemo(() => {
    const items = [
      { label: 'UK', onClick: handleReset, isRoot: true },
    ]
    path.forEach((p, i) => {
      const isLast    = i === path.length - 1
      const clickable = !isLast || !!pendingPlace
      items.push({
        label:   p.value,
        onClick: clickable ? () => handleGoTo(i) : undefined,
      })
    })
    if (pendingPlace) {
      items.push({
        label:   `${pendingPlace.name} (${pendingPlace.place_type})`,
        onClick: undefined,
      })
    }
    return items
  }, [path, pendingPlace, pendingConstituency, pendingWard, handleGoTo, handleReset])

  // ── Row 3 options ────────────────────────────────────────────────────────
  // Walker stops at county — no constituency options in the top nav strip.
  const currentOptions = path.length === 0 ? panel1 : path.length >= 3 ? [] : panel2

  // ── Row visibility ───────────────────────────────────────────────────────
  const row2Visible = true
  const row3Visible = walkerOpen || path.length > 0

  // mapExpand is driven by viewMode, not midTab.
  const mapExpand = viewMode === 'explore'

  const scopeLabel = county ?? region ?? country ?? 'UK'

  const focusSchool = loadedSchools.find(s => s.urn === focusSchoolUrn) ?? null

  function handleFocusSchool(urn)  { setFocusSchoolUrn(urn) }

  // Toggle follow/save for a school. Updates local state and persists to
  // user_follows (logged-in) or ukcp_saves localStorage (anon).
  function handleToggleSchool(urn) {
    const isFollowing = selectedSchoolUrns.includes(urn)
    setSelectedSchoolUrns(prev =>
      isFollowing ? prev.filter(u => u !== urn) : [...prev, urn]
    )

    const school     = loadedSchools.find(s => s.urn === urn)
    const entityName = school?.name ?? null

    if (session?.access_token) {
      const headers = { Authorization: `Bearer ${session.access_token}` }
      if (isFollowing) {
        fetch(`${API_BASE}/api/follows/school/${urn}`, { method: 'DELETE', headers })
          .catch(() => {})
      } else {
        fetch(`${API_BASE}/api/follows`, {
          method:  'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ entity_type: 'school', entity_id: urn, entity_name: entityName }),
        }).catch(() => {})
      }
    } else {
      try {
        const saves = JSON.parse(localStorage.getItem(SAVES_KEY) ?? '[]')
        const next  = isFollowing
          ? saves.filter(s => !(s.entity_type === 'school' && s.entity_id === urn))
          : [...saves, {
              entity_type: 'school',
              entity_id:   urn,
              entity_name: entityName,
              saved_at:    new Date().toISOString(),
            }]
        localStorage.setItem(SAVES_KEY, JSON.stringify(next))
      } catch {}
    }
  }
  function handleNetworkSelect(slug) { setActiveNetwork(slug); setFocusSchoolUrn(null) }
  function handleNetworkBack()       { setActiveNetwork(null) }

  const TAB_NAV_TABS = ['groups', 'news', 'traders', 'civic']
  const showTabNav   = tabNavMode && TAB_NAV_TABS.includes(midTab)

  const locationNav = {
    left: (
      <PlacesCard
        grouped={grouped}
        scopeKey={scopeKey}
        onPlaceSelect={handleLeftPlaceSelect}
        paneTitle={`Places in ${scopeLabel}`}
        focusPlace={pendingPlace}
        onWalkerModeChange={setWalkerMode}
      />
    ),
    right: (
      <ConstituencyPane
        containment={containment}
        path={path}
        hierarchy={hierarchy}
        wards={wards}
        select={handleSelect}
        selectMany={handleSelectMany}
        paneTitle={`Constituencies with wards in ${scopeLabel}`}
        onWalkerModeChange={(active) => setRightWalkerMode(active)}
        walkerMode={rightWalkerMode}
        onConstituencyPending={(name) => { setPendingConstituency(name); setPendingWard(null) }}
        onWardPending={(con, w) => { setPendingConstituency(con); setPendingWard(w) }}
        pendingConstituency={pendingConstituency}
        pendingWard={pendingWard}
      />
    ),
  }

  let activeLeftPane, activeRightPane

  if (activeNetwork === 'at-the-school-gates' && midTab === 'groups') {
    activeLeftPane = (
      <SchoolsLeftNav
        selectedUrns={selectedSchoolUrns}
        focusUrn={focusSchoolUrn}
        onFocusSchool={handleFocusSchool}
        onToggleSchool={handleToggleSchool}
        onBack={handleNetworkBack}
        locationScope={schoolLocationScope}
        onSchoolsChange={setLoadedSchools}
      />
    )
    activeRightPane = (
      <SchoolsRightNav
        focusSchool={focusSchool}
        selectedUrns={selectedSchoolUrns}
        onToggleSchool={handleToggleSchool}
        session={session}
      />
    )
  } else {
    activeLeftPane = showTabNav
      ? midTab === 'groups'  ? <GroupsLeftNav  filter={groupsFilter} onFilterChange={setGroupsFilter} />
      : midTab === 'news'    ? <NewsLeftNav />
      : midTab === 'traders' ? <TradersLeftNav />
      : midTab === 'civic'   ? <CivicLeftNav   locationType={contentContext?.type} locationSlug={contentContext?.slug} />
      : locationNav.left
      : locationNav.left

    activeRightPane = showTabNav
      ? midTab === 'groups'  ? <GroupsRightNav  locationType={contentContext?.type} locationSlug={contentContext?.slug} onNetworkSelect={handleNetworkSelect} />
      : midTab === 'news'    ? <NewsRightNav />
      : midTab === 'traders' ? <TradersRightNav />
      : midTab === 'civic'   ? <CivicRightNav   locationType={contentContext?.type} locationSlug={contentContext?.slug} />
      : locationNav.right
      : locationNav.right
  }

  return (
    <>
    <PageLayout
      header={
        <SiteHeader
          onWalkerToggle={handleWalkerToggle}
          row2Visible={row2Visible}
          row3Visible={row3Visible}
          loading={loading}
          pendingPlace={pendingPlace}
          walkerOpen={walkerOpen}
          path={path}
          onDismiss={dismissPending}
          currentOptions={currentOptions}
          onSelect={handleNavSelect}
          crumbs={crumbs}
          navDepth={path.length}
          mapExpand={mapExpand}
          bannerImage={thumbnail}
        />
      }
      leftPane={activeLeftPane}
      midPane={
        <MidPaneTabs
          activeTab={midTab}
          onTabChange={handleTabChange}
          locationType={locationType}
          viewMode={viewMode}
          onToggleExpand={handleToggleExpand}
          tabNavMode={tabNavMode}
          onToggleTabNav={() => setTabNavMode(v => !v)}
          onPlaceSelect={handlePlaceSelect}
          onGeoSelect={handleSelect}
          newsPane={<NewsStub />}
          groupsPane={
            activeNetwork === 'at-the-school-gates'
              ? <SchoolGatesMid focusSchool={focusSchool} selectedUrns={selectedSchoolUrns} />
              : <GroupsTab locationType={contentContext?.type} locationSlug={contentContext?.slug} filter={groupsFilter} />
          }
          tradersPane={<LocalTradersStub />}
          civicPane={<CommitteeTab locationType={contentContext?.type} locationSlug={contentContext?.slug} />}
          mapPane={
            <MidPaneMap
              places={places}
              wards={wards}
              path={path}
              pendingPlace={pendingPlace}
              onMarkerClick={handleMarkerClick}
              flyTo={flyTo}
              invalidateTrigger={invalidateTrigger}
              activeConstituency={pendingConstituency ?? constituency}
              activeWard={pendingWard ?? ward}
            />
          }
          infoPane={
            <LocationInfo
              contentType={contentType}
              summary={summary}
              extract={extract}
              thumbnail={thumbnail}
              title={title}
              wikiUrl={wikiUrl}
              mpName={mpName}
              party={party}
              partyColour={partyColour}
              population={population ?? gssPopulation}
              geoData={geoData}
              area={area}
              elevation={elevation}
              website={website}
              notable_facts={notable_facts}
              category_tags={category_tags}
              loading={contentLoading}
              error={contentError}
              label={contentContext?.label ?? wardInfo?.ward ?? null}
              wardInfo={wardInfo}
              lat={contextCoords?.lat ?? null}
              lng={contextCoords?.lng ?? null}
              onMapClick={() => {
                setMidTab('map')
                if (contextCoords?.lat && contextCoords?.lng) {
                  const base = MINI_ZOOM[contentContext?.type] ?? 10
                  setFlyTo({ lat: contextCoords.lat, lng: contextCoords.lng, zoom: Math.min(18, base + 2) })
                }
              }}
            />
          }
        />
      }
      rightPane={activeRightPane}
      footer={<Footer />}
      mapExpand={mapExpand}
    />
    {!snapshotReady && (
      <div role="status" aria-live="polite" style={restoringScrim}>
        <span style={restoringText}>Restoring session…</span>
      </div>
    )}
    </>
  )
}

// Brief overlay shown while the session snapshot loads. Blocks input so a
// fast user click cannot land before the snapshot hook is ready to persist.
const restoringScrim = {
  position:        'fixed',
  inset:           0,
  background:      'rgba(255, 255, 255, 0.65)',
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  zIndex:          1000,
  pointerEvents:   'auto',
}
const restoringText = {
  fontSize:   13,
  color:      '#495057',
  background: '#fff',
  padding:    '8px 14px',
  borderRadius: 4,
  boxShadow:  '0 1px 3px rgba(0,0,0,0.1)',
}
