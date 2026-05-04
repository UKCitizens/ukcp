/**
 * @file GroupsRightNav.jsx
 * @description Right nav for the Groups tab.
 *
 * Three accordion sections following the right-pane-as-status contract:
 *   1. Filters       -- group type filter (All / Groups / Local Spaces)
 *   2. Networks      -- Community Networks selector for current location
 *   3. My Schools    -- session-selected + followed schools; detail on focus
 *
 * My Schools section is visible whenever activeNetwork is 'at-the-school-gates'
 * or the user has active/followed schools.
 *
 * Props:
 *   locationType, locationSlug, onNetworkSelect
 *   filter, onFilterChange
 *   activeNetwork
 *   activeSchoolUrns   -- session-selected (local state only)
 *   followedSchoolUrns -- persistent follows
 *   loadedSchools      -- full school objects from the left nav fetch
 *   focusSchoolUrn, onFocusSchool
 *   onToggleFollow     -- persist a follow to API / localStorage
 *   session
 */
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import CommunityNetworksSection from '../Groups/CommunityNetworksSection.jsx'

// ── Accordion shell ───────────────────────────────────────────────────────────

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={sectionWrap}>
      <button style={sectionToggle} onClick={() => setOpen(o => !o)}>
        <span style={sectionTitle}>{title}</span>
        <span style={chevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={sectionBody}>{children}</div>}
    </div>
  )
}

// ── Filters ───────────────────────────────────────────────────────────────────

function FiltersSection({ filter, onFilterChange }) {
  const FILTERS = [
    { key: 'all',    label: 'All' },
    { key: 'groups', label: 'Groups' },
    { key: 'spaces', label: 'Local Spaces' },
  ]
  return (
    <Section title="Filters">
      {FILTERS.map(f => (
        <label key={f.key} style={radioRow}>
          <input
            type="radio"
            name="groups-filter"
            checked={filter === f.key}
            onChange={() => onFilterChange(f.key)}
            style={{ margin: 0, marginRight: 6, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, color: filter === f.key ? '#2f9e44' : '#495057', fontWeight: filter === f.key ? 500 : 400 }}>
            {f.label}
          </span>
        </label>
      ))}
    </Section>
  )
}

// ── Community Networks ────────────────────────────────────────────────────────

function NetworksSection({ locationType, locationSlug, session, onNetworkSelect }) {
  return (
    <Section title="Community Networks">
      {!locationType || !locationSlug ? (
        <p style={dim}>Select a location to see networks active here.</p>
      ) : (
        <CommunityNetworksSection
          locationType={locationType}
          locationSlug={locationSlug}
          session={session}
          onNetworkSelect={onNetworkSelect}
        />
      )}
    </Section>
  )
}

// ── My Schools ────────────────────────────────────────────────────────────────

function SchoolDetailPane({ school, isFollowed, onToggleFollow, session, onBack }) {
  const followLabel = session
    ? (isFollowed ? 'Following' : 'Follow')
    : (isFollowed ? 'Saved'     : 'Save')
  return (
    <div>
      <button style={backBtn} onClick={onBack}>&larr; My Schools</button>
      <div style={detailCard}>
        <p style={schoolName}>{school.name}</p>
        <p style={metaText}>{school.phase} -- {school.type}</p>
        {school.street  && <p style={addrText}>{school.street}</p>}
        {school.postcode && <p style={addrText}>{school.postcode}</p>}
        {school.head     && <p style={metaText}>{school.head_role}: {school.head}</p>}
        <p style={dimText}>Ward: {school.ward_name} | Con: {school.con_name}</p>
        <button
          style={isFollowed ? followingBtn : followBtn}
          onClick={() => onToggleFollow(school.urn)}
        >
          {followLabel}
        </button>
      </div>
      <hr style={divider} />
      <p style={sectionHead}>Actions</p>
      {['Message school', 'Raise a survey', 'Organise an event'].map(a => (
        <div key={a} style={actionRow} onClick={() => alert(`${a} -- coming soon`)}>
          <span style={{ fontSize: 10, color: '#ced4da' }}>&gt;</span>
          <span style={{ fontSize: 12 }}>{a}</span>
        </div>
      ))}
    </div>
  )
}

function MySchoolsSection({ activeSchoolUrns, followedSchoolUrns, loadedSchools, focusSchoolUrn, onFocusSchool, onToggleFollow, session }) {
  const allUrns   = [...new Set([...activeSchoolUrns, ...followedSchoolUrns])]
  const mySchools = allUrns.map(urn => loadedSchools.find(s => s.urn === urn)).filter(Boolean)
  const focused   = focusSchoolUrn ? loadedSchools.find(s => s.urn === focusSchoolUrn) : null

  return (
    <Section title="My Schools">
      {allUrns.length === 0 ? (
        <p style={dim}>Select a school from the left to add it here.</p>
      ) : focused ? (
        <SchoolDetailPane
          school={focused}
          isFollowed={followedSchoolUrns.includes(focused.urn)}
          onToggleFollow={onToggleFollow}
          session={session}
          onBack={() => onFocusSchool(null)}
        />
      ) : (
        mySchools.map(s => {
          const isActive   = activeSchoolUrns.includes(s.urn)
          const isFollowed = followedSchoolUrns.includes(s.urn)
          return (
            <div key={s.urn} style={schoolRow} onClick={() => onFocusSchool(s.urn)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={schoolRowName}>{s.name}</span>
                <span style={schoolRowMeta}>{s.type_group}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {isActive   && <span style={badge('blue')}>Active</span>}
                {isFollowed && <span style={badge('green')}>Following</span>}
              </div>
            </div>
          )
        })
      )}
    </Section>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function GroupsRightNav({
  locationType, locationSlug, onNetworkSelect,
  filter, onFilterChange,
  activeNetwork,
  activeSchoolUrns   = [],
  followedSchoolUrns = [],
  loadedSchools      = [],
  focusSchoolUrn, onFocusSchool,
  onToggleFollow,
  session,
}) {
  const { session: ctxSession } = useAuth()
  const resolvedSession = session ?? ctxSession

  const showMySchools = activeNetwork === 'at-the-school-gates' ||
    activeSchoolUrns.length > 0 || followedSchoolUrns.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <FiltersSection filter={filter} onFilterChange={onFilterChange} />
      <NetworksSection
        locationType={locationType}
        locationSlug={locationSlug}
        session={resolvedSession}
        onNetworkSelect={onNetworkSelect}
      />
      {showMySchools && (
        <MySchoolsSection
          activeSchoolUrns={activeSchoolUrns}
          followedSchoolUrns={followedSchoolUrns}
          loadedSchools={loadedSchools}
          focusSchoolUrn={focusSchoolUrn}
          onFocusSchool={onFocusSchool}
          onToggleFollow={onToggleFollow}
          session={resolvedSession}
        />
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionWrap   = { borderBottom: '1px solid #f1f3f5' }
const sectionToggle = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer' }
const sectionTitle  = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', letterSpacing: '0.05em' }
const chevron       = { fontSize: 9, color: '#adb5bd' }
const sectionBody   = { padding: '2px 10px 8px' }
const radioRow      = { display: 'flex', alignItems: 'center', marginBottom: 5, cursor: 'pointer', userSelect: 'none' }
const dim           = { fontSize: 12, color: '#adb5bd', margin: '4px 0', lineHeight: 1.5, fontStyle: 'italic' }
const backBtn       = { fontSize: 12, color: '#1971c2', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px 0', display: 'block' }
const detailCard    = { border: '1px solid #dee2e6', borderRadius: 6, padding: 10, marginBottom: 8 }
const schoolName    = { fontSize: 13, fontWeight: 600, color: '#212529', margin: '0 0 3px 0' }
const metaText      = { fontSize: 11, color: '#868e96', margin: '2px 0 0 0' }
const addrText      = { fontSize: 12, color: '#495057', margin: '1px 0 0 0' }
const dimText       = { fontSize: 11, color: '#adb5bd', margin: '4px 0 6px 0' }
const followBtn     = { fontSize: 12, padding: '3px 10px', border: 'none', borderRadius: 4, background: '#2f9e44', color: '#fff', cursor: 'pointer', marginTop: 4 }
const followingBtn  = { fontSize: 12, padding: '3px 10px', border: '1px solid #2f9e44', borderRadius: 4, background: '#fff', color: '#2f9e44', cursor: 'pointer', marginTop: 4 }
const divider       = { border: 'none', borderTop: '1px solid #f1f3f5', margin: '8px 0' }
const sectionHead   = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 5px 0', letterSpacing: '0.05em' }
const actionRow     = { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #f8f9fa', cursor: 'pointer', color: '#1971c2' }
const schoolRow     = { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #f8f9fa', cursor: 'pointer' }
const schoolRowName = { fontSize: 12, color: '#212529', display: 'block', lineHeight: 1.3 }
const schoolRowMeta = { fontSize: 10, color: '#adb5bd', display: 'block', marginTop: 1 }
const badge = (color) => ({
  fontSize: 10, padding: '1px 5px', borderRadius: 3,
  background: color === 'green' ? '#ebfbee' : '#e7f5ff',
  color:      color === 'green' ? '#2f9e44' : '#1971c2',
})
