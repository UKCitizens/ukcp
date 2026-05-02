/**
 * @file TradersRightNav.jsx
 * @description Right nav for the Local Traders tab. Featured and national
 *   trader slots (paid positions). Stub pending commercial model build.
 */
export default function TradersRightNav() {
  return (
    <div style={{ padding: 8 }}>
      <p style={head}>Featured Traders</p>
      <p style={dim}>National and featured trader listings will appear here.</p>
    </div>
  )
}
const head = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 8px 0', letterSpacing: '0.05em' }
const dim  = { fontSize: 12, color: '#adb5bd', margin: 0, lineHeight: 1.5 }
