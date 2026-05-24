/**
 * @file src/components/Posts/PostVideoEmbed.jsx
 * @description Inline video embed -- lite / facade pattern. Shows the thumbnail
 *   with a play button; swaps in the real player only on click.
 *
 *   Two player kinds:
 *     youtube / vimeo  -- provider iframe, src built from a validated video_id.
 *     bluesky          -- native HLS stream (.m3u8) played via hls.js, which is
 *                         dynamically imported on first play so it stays out of
 *                         the main bundle.
 *
 * Props:
 *   embed    -- { type:'video', provider, video_id?, stream_url?, url, title,
 *                 image, domain }
 *   onRemove -- function(), optional -- shows x if provided (composer use only)
 */

import { useState, useRef, useEffect } from 'react'

const ID_PATTERN = {
  youtube: /^[A-Za-z0-9_-]{11}$/,
  vimeo:   /^[0-9]+$/,
}

const IFRAME_PROVIDERS = ['youtube', 'vimeo']

// True only if this is a video embed we can safely build a player for.
// PostEmbed checks this before routing here; the component re-checks too.
export function isPlayableVideo(embed) {
  if (!embed || embed.type !== 'video') return false
  if (embed.provider === 'bluesky') {
    return typeof embed.stream_url === 'string' && /^https:\/\//.test(embed.stream_url)
  }
  const pattern = ID_PATTERN[embed.provider]
  return Boolean(pattern && embed.video_id && pattern.test(String(embed.video_id)))
}

function iframeSrc(provider, id) {
  if (provider === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
  }
  if (provider === 'vimeo') {
    return `https://player.vimeo.com/video/${id}?autoplay=1`
  }
  return null
}

// HLS player for Bluesky video. Safari / iOS play .m3u8 natively; every other
// browser needs hls.js, imported lazily here so it ships as its own chunk and
// stays out of the main bundle.
function HlsVideo({ src, poster }) {
  const ref = useRef(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      video.play().catch(() => {})
      return
    }

    let hls = null
    let cancelled = false
    import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !Hls.isSupported()) return
      hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}) })
    })
    return () => { cancelled = true; if (hls) hls.destroy() }
  }, [src])

  return <video ref={ref} poster={poster} controls playsInline style={frame} />
}

export default function PostVideoEmbed({ embed, onRemove }) {
  const [playing, setPlaying] = useState(false)

  if (!isPlayableVideo(embed)) return null
  const isIframe = IFRAME_PROVIDERS.includes(embed.provider)

  return (
    <div style={wrap}>
      <div style={ratio}>
        {playing ? (
          isIframe ? (
            <iframe
              src={iframeSrc(embed.provider, embed.video_id)}
              title={embed.title || 'Video'}
              style={frame}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <HlsVideo src={embed.stream_url} poster={embed.image || undefined} />
          )
        ) : (
          <button type="button" style={facade} onClick={() => setPlaying(true)} title="Play video">
            {embed.image && (
              <img
                src={embed.image}
                alt=""
                style={thumb}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <span style={shade} />
            <span style={playBtn}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>

      <div style={footer}>
        {embed.title && <span style={titleText}>{embed.title}</span>}
        <span style={domainText}>{embed.domain}</span>
      </div>

      {onRemove && (
        <button
          type="button"
          style={removeBtn}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove() }}
          title="Remove video"
        >
          x
        </button>
      )}
    </div>
  )
}

const wrap       = { position: 'relative', marginTop: 8, border: '1px solid #e9ecef', borderRadius: 8, overflow: 'hidden', background: '#000' }
const ratio      = { position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, background: '#000' }
const frame      = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }
const facade     = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: 0, border: 'none', cursor: 'pointer', background: '#000', display: 'block' }
const thumb      = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const shade      = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' }
const playBtn    = { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 58, height: 58, borderRadius: '50%', background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 4 }
const footer     = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', background: '#fff' }
const titleText  = { fontSize: 13, fontWeight: 600, color: '#212529', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const domainText = { fontSize: 11, color: '#adb5bd', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }
const removeBtn  = { position: 'absolute', top: 8, right: 10, fontSize: 16, lineHeight: 1, color: '#fff', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, zIndex: 2 }
