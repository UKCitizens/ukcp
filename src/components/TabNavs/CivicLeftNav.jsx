/**
 * @file CivicLeftNav.jsx
 * @description Left nav for the Civic tab. Constituency committee section
 *   and civic action links (petitions, activist groups).
 * Props: locationType, locationSlug
 */
export default function CivicLeftNav({ locationType, locationSlug }) {
  return (
    <div style={{ padding: 8 }}>
      <p style={head}>Constituency Committee</p>
      <p style={dim}>
        {locationType === 'constituency'
          ? 'Your constituency committee and forum is in the main panel.'
          : 'Navigate to a constituency to access its committee.'}
      </p>
      <p style={{ ...head, marginTop: 12 }}>Civic Actions</p>
      <p style={{ ...dim, marginBottom: 6 }}>Petitions -- coming soon</p>
      <p style={dim}>Activist Groups -- coming soon</p>
    </div>
  )
}
const head = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 8px 0', letterSpacing: '0.05em' }
const dim  = { fontSize: 12, color: '#adb5bd', margin: '0 0 4px 0', lineHeight: 1.5 }
