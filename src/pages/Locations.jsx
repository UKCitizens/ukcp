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

import { useState, useMemo, useCallback, useEffect } from 'react'
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
import { NAV_COORDS } from '../config/navCoords.js'
import { findRelatedPlace } from '../utils/findRelatedPlace.js'
import { NewsStub, PeopleStub, GovernmentStub } from '../components/TabStubs.jsx'
import GroupsTab    from '../components/Groups/GroupsTab.jsx'
import PostsTab     from '../components/Posts/PostsTab.jsx'
import CommitteeTab from '../components/Committee/CommitteeTab.jsx'

export default function Locations() {
  const { places, wards, hierarchy, containment, loading } = useLocationData()
  const { path, panel1, panel2, select, selectMany, goTo, reset } = useNavigation(hierarchy)
  const { grouped, scopeKey } = usePlacesFilter(places, path)
  const {
    pendingPlace,
    setPending,
    dismissPending,
  } = useSelectionState()

  const [walkerOpen,        setWalkerOpen]        = useState(true)
  const [midTab,            setMidTab]            = useState('map')
  const [viewMode,          setViewMode]          = useState('browse')  // 'browse' | 'explore'
  const [flyTo,             setFlyTo]             = useState(null)
  const [invalidateTrigger, setInvalidateTrigger] = useState(0)
  const [walkerMode, setWalkerMode] = useState(false)  // left pane walker mode
  const [rightWalkerMode,     setRightWalkerMode]     = useState(false)
  const [pendingConstituency, setPendingConstituency] = useState(null)
  const [pendingWard,         setPendingWard]         = useState(null)

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

  // Resolve country/region/county ancestors for a constituency name from wards data.
  // Returns pairs array ready to prepend to a selectMany call.
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

  // Right-pane constituency/ward selection — commit path only.
  // Walker-mode constituency clicks are handled via onConstituencyPending (direct callback).
  // Walker-mode ward clicks are handled via onWardPending (direct callback).
  // Map marker ward clicks in walker mode still route through handleSelectMany.
  const handleSelect = useCallback((level, value) => {
    dismissPending()
    setPendingConstituency(null)
    setPendingWard(null)
    setRightWalkerMode(false)
    const ancestors = level === 'constituency' ? resolveConstituencyAncestors(value) : []
    selectMany([...ancestors, { level, value }])
    setMidTab('map')
  }, [dismissPending, selectMany, resolveConstituencyAncestors])

  const handleSelectMany = useCallback((pairs) => {
    if (rightWalkerMode) {
      const conPair  = pairs.find(p => p.level === 'constituency')
      const wardPair = pairs.find(p => p.level === 'ward')
      if (conPair)  setPendingConstituency(conPair.value)
      if (wardPair) setPendingWard(wardPair.value)
      return
    }
    dismissPending()
    const conPair   = pairs.find(p => p.level === 'constituency')
    const ancestors = conPair ? resolveConstituencyAncestors(conPair.value) : []
    selectMany([...ancestors, ...pairs])
    setMidTab('map')
  }, [rightWalkerMode, dismissPending, selectMany, resolveConstituencyAncestors])

  // Left-pane place click.
  // Drill mode: derive full nav path from place fields so right pane scopes correctly,
  //   crumb trail is complete, map positions to the right area. Tab switches to map.
  // Walker mode (All active): skip selectMany so the list scope doesn't collapse —
  //   just set the pending place for flyTo, crumb, and info content. Tab stays put.
  const handlePlaceSelect = useCallback((place) => {
    if (walkerMode) {
      setPending(place)
    } else {
      const pairs = []
      if (place.country)   pairs.push({ level: 'country', value: place.country })
      if (place.region)    pairs.push({ level: 'region',  value: place.region })
      if (place.ctyhistnm) pairs.push({ level: 'county',  value: place.ctyhistnm })
      if (pairs.length) selectMany(pairs)
      setPending(place)
      setMidTab('map')
    }
  }, [selectMany, setPending, walkerMode])

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
    if (midTab === 'government' && NAMED_PLACES_GUARD.includes(locationType ?? '')) {
      setMidTab('info')
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
    if (pendingConstituency && !pendingPlace) {
      items.push({ label: pendingConstituency, onClick: undefined })
    }
    if (pendingWard && !pendingPlace) {
      items.push({ label: `${pendingWard} (Ward)`, onClick: undefined })
    }
    return items
  }, [path, pendingPlace, pendingConstituency, pendingWard, handleGoTo, handleReset])

  // ── Row 3 options ────────────────────────────────────────────────────────
  const currentOptions = path.length === 0 ? panel1 : panel2

  // ── Row visibility ───────────────────────────────────────────────────────
  const row2Visible = true
  const row3Visible = walkerOpen || path.length > 0

  // mapExpand is driven by viewMode, not midTab.
  const mapExpand = viewMode === 'explore'

  // Pane header label — geographic scope (county > region > country > UK).
  // Excludes constituency/ward — places and constituencies are scoped to county.
  const scopeLabel = county ?? region ?? country ?? 'UK'

  return (
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
      leftPane={
        <PlacesCard
          grouped={grouped}
          scopeKey={scopeKey}
          onPlaceSelect={handlePlaceSelect}
          paneTitle={`Places in ${scopeLabel}`}
          focusPlace={pendingPlace}
          onWalkerModeChange={setWalkerMode}
        />
      }
      midPane={
        <MidPaneTabs
          activeTab={midTab}
          onTabChange={handleTabChange}
          locationType={locationType}
          viewMode={viewMode}
          onToggleExpand={handleToggleExpand}
          onPlaceSelect={handlePlaceSelect}
          onGeoSelect={handleSelect}
          newsPane={<NewsStub />}
          groupsPane={<GroupsTab locationType={contentContext?.type} locationSlug={contentContext?.slug} />}
          postsPane={<PostsTab  locationType={contentContext?.type} locationSlug={contentContext?.slug} />}
          peoplePane={<PeopleStub />}
          governmentPane={<GovernmentStub />}
          committeePane={<CommitteeTab locationType={contentContext?.type} locationSlug={contentContext?.slug} />}
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
      rightPane={
        <ConstituencyPane
          containment={containment}
          path={path}
          hierarchy={hierarchy}
          wards={wards}
          select={handleSelect}
          selectMany={handleSelectMany}
          paneTitle={`Constituencies with wards in ${scopeLabel}`}
          onWalkerModeChange={(active) => {
            setRightWalkerMode(active)
            if (!active) { setPendingConstituency(null); setPendingWard(null) }
          }}
          walkerMode={rightWalkerMode}
          onConstituencyPending={(name) => { setPendingConstituency(name); setPendingWard(null) }}
          onWardPending={(con, w) => { setPendingConstituency(con); setPendingWard(w) }}
          pendingConstituency={pendingConstituency}
          pendingWard={pendingWard}
        />
      }
      footer={<Footer />}
      mapExpand={mapExpand}
    />
  )
}
