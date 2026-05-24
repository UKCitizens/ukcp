/**
 * @file src/components/Posts/PostEmbed.jsx
 * @description Link preview card: stacked layout.
 *   Title (top) -> full-width image (350px) -> description -> domain (bottom).
 *
 * Props:
 *   embed    -- { url, title, description, image, domain }
 *   onRemove -- function(), optional -- show x if provided (composer use only)
 */

import PostVideoEmbed, { isPlayableVideo } from './PostVideoEmbed.jsx'

export default function PostEmbed({ embed, onRemove }) {
  if (!embed?.url) return null

  // A video embed renders an inline player instead of the static card.
  // isPlayableVideo sends a malformed video payload back to the card path.
  if (embed.type === 'video' && isPlayableVideo(embed)) {
    return <PostVideoEmbed embed={embed} onRemove={onRemove} />
  }

  return (
    <a href={embed.url} target="_blank" rel="noopener noreferrer" style={card}>

      {/* Title row */}
      {embed.title && <div style={titleRow}>{embed.title}</div>}

      {/* Hero image */}
      {embed.image && (
        <div style={heroWrap}>
          <img
            src={embed.image}
            alt=""
            style={heroImg}
            onError={e => { e.currentTarget.parentElement.style.display = 'none' }}
          />
        </div>
      )}

      {/* Description */}
      {embed.description && <p style={descText}>{embed.description}</p>}

      {/* Domain footer */}
      <div style={footer}>
        <img
          src={`https://www.google.com/s2/favicons?sz=14&domain=${embed.domain}`}
          alt=""
          style={favicon}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <span style={domainText}>{embed.domain}</span>
      </div>

      {/* Remove button -- composer only */}
      {onRemove && (
        <button
          type="button"
          style={removeBtn}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove() }}
          title="Remove preview"
        >
          x
        </button>
      )}
    </a>
  )
}

const card       = { display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid #e9ecef', borderRadius: 8, overflow: 'hidden', background: '#fff', marginTop: 8, position: 'relative', cursor: 'pointer' }
const titleRow   = { fontSize: 15, fontWeight: 700, color: '#212529', padding: '12px 14px 8px', lineHeight: 1.35 }
const heroWrap   = { width: '100%', height: 350, overflow: 'hidden', background: '#f1f3f5' }
const heroImg    = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const descText   = { fontSize: 13, color: '#495057', margin: 0, padding: '10px 14px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
const footer     = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px 12px', borderTop: '1px solid #f1f3f5' }
const favicon    = { width: 14, height: 14, flexShrink: 0 }
const domainText = { fontSize: 11, color: '#adb5bd', textTransform: 'uppercase', letterSpacing: '0.05em' }
const removeBtn  = { position: 'absolute', top: 8, right: 10, fontSize: 16, lineHeight: 1, color: '#fff', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }
