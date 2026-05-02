/**
 * @file CivicRightNav.jsx
 * @description Right nav for the Civic tab. Higher-level civic bodies
 *   relevant to the current location scope.
 * Props: locationType, locationSlug
 */
export default function CivicRightNav({ locationType, locationSlug }) {
  return (
    <div style={{ padding: 8 }}>
      <p style={head}>Local Authority</p>
      <p style={dim}>County council, regional and national civic bodies relevant to this location -- coming soon.</p>
    </div>
  )
}
const head = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 8px 0', letterSpacing: '0.05em' }
const dim  = { fontSize: 12, color: '#adb5bd', margin: 0, lineHeight: 1.5 }
