/**
 * @file GroupsRightNav.jsx
 * @description Right nav for the Groups tab. Renders National Networks
 *   (CommunityNetworksSection) for the current location scope.
 * Props: locationType, locationSlug
 */
import { useAuth } from '../../context/AuthContext.jsx'
import CommunityNetworksSection from '../Groups/CommunityNetworksSection.jsx'

export default function GroupsRightNav({ locationType, locationSlug, onNetworkSelect }) {
  const { session } = useAuth()

  if (!locationType || !locationSlug) {
    return (
      <div style={{ padding: 8 }}>
        <p style={head}>National Networks</p>
        <p style={dim}>Select a location to see national networks active here.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <p style={head}>National Networks</p>
      <CommunityNetworksSection
        locationType={locationType}
        locationSlug={locationSlug}
        session={session}
        onNetworkSelect={onNetworkSelect}
      />
    </div>
  )
}
const head = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 8px 8px', letterSpacing: '0.05em' }
const dim  = { fontSize: 12, color: '#adb5bd', margin: '0 8px', lineHeight: 1.5 }
