/**
 * @file src/components/SchoolGates/SchoolsRightNav.jsx
 * @description Right nav for At the School Gates network mode.
 *   Shows school detail card and action stubs for the focused school.
 * Props: focusSchool, selectedUrns, onToggleSchool, session
 */
export default function SchoolsRightNav({ focusSchool, selectedUrns, onToggleSchool, session }) {
  if (!focusSchool) {
    return (
      <div style={{ padding: 16 }}>
        <p style={dim}>Select a school to view details.</p>
      </div>
    )
  }

  const isFollowing = selectedUrns.includes(focusSchool.urn)
  const label = session
    ? (isFollowing ? 'Following' : 'Follow')
    : (isFollowing ? 'Saved'     : 'Save')
  const btnStyle = isFollowing ? followingBtn : followBtn

  return (
    <div style={{ padding: 10, overflowY: 'auto' }}>
      <div style={detailCard}>
        <p style={schoolName}>{focusSchool.name}</p>
        <p style={meta}>{focusSchool.phase} -- {focusSchool.type}</p>
        <p style={meta}>{focusSchool.gender}</p>
        <div style={{ marginTop: 6 }}>
          <p style={addr}>{focusSchool.street}</p>
          <p style={addr}>{focusSchool.postcode}</p>
        </div>
        <p style={meta}>{focusSchool.head_role}: {focusSchool.head}</p>
        <p style={{ ...dim, marginTop: 4 }}>
          Ward: {focusSchool.ward_name} | Con: {focusSchool.con_name}
        </p>
        <div style={{ marginTop: 10 }}>
          <button style={btnStyle} onClick={() => onToggleSchool(focusSchool.urn)}>
            {label}
          </button>
        </div>
      </div>

      <hr style={divider} />

      <p style={sectionHead}>Actions</p>
      <div style={actionRow} onClick={() => alert('Message school -- coming soon')}>
        <span style={actionChevron}>&gt;</span>
        <span style={actionLabel}>Message school</span>
      </div>
      <div style={actionRow} onClick={() => alert('Raise a survey -- coming soon')}>
        <span style={actionChevron}>&gt;</span>
        <span style={actionLabel}>Raise a survey</span>
      </div>
      <div style={{ ...actionRow, borderBottom: 'none' }} onClick={() => alert('Organise an event -- coming soon')}>
        <span style={actionChevron}>&gt;</span>
        <span style={actionLabel}>Organise an event</span>
      </div>
    </div>
  )
}

const dim          = { fontSize: 12, color: '#adb5bd', margin: 0 }
const detailCard   = { border: '1px solid #dee2e6', borderRadius: 6, padding: 12 }
const schoolName   = { fontSize: 13, fontWeight: 600, color: '#212529', margin: '0 0 2px 0' }
const meta         = { fontSize: 11, color: '#868e96', margin: '2px 0 0 0' }
const addr         = { fontSize: 12, color: '#495057', margin: '1px 0 0 0' }
const followBtn    = { fontSize: 12, padding: '4px 10px', border: 'none', borderRadius: 4, background: '#2f9e44', color: '#fff', cursor: 'pointer' }
const followingBtn = { fontSize: 12, padding: '4px 10px', border: '1px solid #2f9e44', borderRadius: 4, background: '#fff', color: '#2f9e44', cursor: 'pointer' }
const divider      = { border: 'none', borderTop: '1px solid #f1f3f5', margin: '10px 0' }
const sectionHead  = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 6px 0', letterSpacing: '0.05em' }
const actionRow    = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f8f9fa', cursor: 'pointer', color: '#1971c2', fontSize: 12 }
const actionChevron = { fontSize: 10, color: '#ced4da' }
const actionLabel  = { fontSize: 12 }
