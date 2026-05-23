/**
 * @file src/components/Posts/RichEditor.jsx
 * @description TipTap rich text editor. Toolbar: Bold, Italic, Link, Image, Emoji.
 *   Emoji panel: 8 categories, floating, click inserts at cursor.
 *   Expand-on-focus behavior. Detects pasted URLs -> fires onUrlPasted.
 *
 * Props:
 *   content       -- string (HTML)
 *   onUpdate      -- function(html)
 *   onUrlPasted   -- function(url)
 *   onImageClick  -- function() -- fires when image button clicked
 *   placeholder   -- string
 *   expanded      -- boolean
 *   onFocus       -- function()
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit                   from '@tiptap/starter-kit'
import Link                         from '@tiptap/extension-link'
import Placeholder                  from '@tiptap/extension-placeholder'
import { useEffect, useState, useRef } from 'react'

const URL_RE = /^https?:\/\/[^\s]+$/

// ── Emoji data ────────────────────────────────────────────────────────────────
const EMOJI_CATS = [
  {
    icon: '😊', name: 'Smileys',
    e: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😋','😛','😝','😜','🤪','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😓','🤗','🤔','🤭','🤫','🤥','😶','😑','😬','🙄','😯','😲','🥱','😴','😵','🤢','🤮','🤧','😷','🤒','🤕'],
  },
  {
    icon: '👋', name: 'People',
    e: ['👋','🤚','✋','🖖','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','👏','🙌','🤲','🙏','💪','🦾','👀','👅','👃','👂','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','👮','💂','🕵️','👷','🤴','👸','🧙','🧝','🧛','🧟','🧞','🧜','🧚','👼','🎅','🤶','🦸','🦹'],
  },
  {
    icon: '🐶', name: 'Animals',
    e: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🐢','🐍','🦎','🐊','🦕','🦖','🐙','🦑','🦀','🦞','🦐','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊'],
  },
  {
    icon: '🍎', name: 'Food',
    e: ['🍎','🍊','🍋','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥦','🌽','🌶️','🧄','🧅','🥔','🍠','🥐','🍞','🥖','🧀','🥚','🍳','🥞','🧇','🥓','🍗','🍖','🌮','🌯','🥙','🍕','🍔','🍟','🌭','🥗','🍣','🍱','🍜','🍝','🍛','🍲','🍮','🍭','🍬','🍫','🎂','🍰','🧁','🍩','🍪','☕','🍵','🧃','🥤','🧋','🍺','🥂','🍷','🥃'],
  },
  {
    icon: '⚽', name: 'Activities',
    e: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','⛳','🎯','🎮','🕹️','🎲','🧩','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎸','🎺','🎷','🎻','🏆','🥇','🥈','🥉','🎖️','🎗️','🎫','🎟️','🤹','🎠','🎡','🎢','🎪'],
  },
  {
    icon: '🚗', name: 'Travel',
    e: ['🚗','🚕','🚙','🚌','🏎️','🚓','🚑','🚒','🚀','✈️','🛩️','🚁','🛸','🚂','🚆','🚇','🚢','⛵','🚤','🚲','🛴','🛵','🏍️','⛽','🚦','🌍','🌎','🌏','🗺️','🏔️','⛰️','🌋','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🏠','🏡','🏢','🏥','🏦','🏨','🏪','🏫','🏬','🏭','🏯','🏰','🗼','🗽','⛪','🕌'],
  },
  {
    icon: '💡', name: 'Objects',
    e: ['💡','🔦','🕯️','📱','💻','🖥️','📷','📸','📹','🎥','📞','☎️','📺','📻','🧭','⌚','🔋','🔌','💰','💳','💎','🔧','🔨','⚒️','🛠️','🔑','🗝️','🔒','🔓','🧲','📎','✂️','📦','📫','✏️','📝','📚','📖','🔖','🏷️','🔬','🔭','💊','🩺','🎁','🎀','🎆','🎇','🧨','✨','🎉','🎊','🧸','🪆','🎭','🪄','🧿','🪬'],
  },
  {
    icon: '❤️', name: 'Symbols',
    e: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💯','✅','❌','⭕','🚫','⚡','🔥','💧','🌊','⭐','🌟','💫','✨','🎵','🎶','❓','❗','💢','💬','💭','🔔','🔕','🔇','🔊','📢','📣','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔷','🔶','🔹','🔸'],
  },
]

export default function RichEditor({
  content,
  onUpdate,
  onUrlPasted,
  onImageClick,
  placeholder = "What's on your mind?",
  expanded = false,
  onFocus,
}) {
  const [showEmoji, setShowEmoji] = useState(false)
  const [emojiCat,  setEmojiCat]  = useState(0)
  const emojiRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, code: false, link: false }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate({ editor }) {
      onUpdate?.(editor.getHTML())
    },
    onFocus() {
      onFocus?.()
    },
    editorProps: {
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain')?.trim()
        if (text && URL_RE.test(text)) {
          onUrlPasted?.(text)
        }
        return false
      },
    },
  })

  // Sync external reset (clear after submit)
  useEffect(() => {
    if (!editor) return
    if (content === '' || content === '<p></p>') {
      editor.commands.clearContent()
    }
  }, [content, editor])

  // Close emoji panel on outside click
  useEffect(() => {
    if (!showEmoji) return
    function handler(e) {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji])

  function insertEmoji(emoji) {
    editor?.chain().focus().insertContent(emoji).run()
  }

  function execLink() {
    const prev = editor.getAttributes('link').href
    const url  = window.prompt('URL:', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  if (!editor) return null

  return (
    <div style={{ ...editorWrap, minHeight: expanded ? 120 : 36 }}>

      {/* ── Toolbar ── */}
      {expanded && (
        <div style={toolbar}>
          <button type="button" style={tbBtn(editor.isActive('bold'))}
            onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}>
            <strong>B</strong>
          </button>
          <button type="button" style={tbBtn(editor.isActive('italic'))}
            onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}>
            <em>I</em>
          </button>
          <button type="button" style={tbBtn(editor.isActive('link'))}
            onMouseDown={e => { e.preventDefault(); execLink() }}>
            Link
          </button>
          <div style={tbSep} />
          <button type="button" style={tbBtn(false)}
            onMouseDown={e => { e.preventDefault(); onImageClick?.() }}
            title="Add image">
            📷
          </button>
          {/* Emoji trigger + panel */}
          <div style={{ position: 'relative' }} ref={emojiRef}>
            <button type="button" style={tbBtn(showEmoji)}
              onMouseDown={e => { e.preventDefault(); setShowEmoji(v => !v) }}
              title="Emoji">
              😊
            </button>
            {showEmoji && (
              <div style={emojiPanel}>
                {/* Category tabs */}
                <div style={catRow}>
                  {EMOJI_CATS.map((cat, i) => (
                    <button
                      key={cat.name}
                      type="button"
                      style={catBtn(i === emojiCat)}
                      onMouseDown={e => { e.preventDefault(); setEmojiCat(i) }}
                      title={cat.name}
                    >
                      {cat.icon}
                    </button>
                  ))}
                </div>
                {/* Emoji grid */}
                <div style={emojiGrid}>
                  {EMOJI_CATS[emojiCat].e.map(em => (
                    <button
                      key={em}
                      type="button"
                      style={emojiBtn}
                      onMouseDown={e => { e.preventDefault(); insertEmoji(em); setShowEmoji(false) }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Editor area ── */}
      <EditorContent editor={editor} style={editorContent} />
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const editorWrap    = { border: '1px solid #dee2e6', borderRadius: 6, background: '#fff', overflow: 'visible', display: 'flex', flexDirection: 'column', transition: 'min-height 0.18s ease', position: 'relative' }
const toolbar       = { display: 'flex', alignItems: 'center', gap: 2, padding: '4px 6px', borderBottom: '1px solid #f1f3f5', background: '#f8f9fa', flexWrap: 'wrap' }
const tbBtn = (active) => ({
  fontSize: 12, padding: '3px 8px', borderRadius: 4, border: 'none',
  background: active ? '#dee2e6' : 'transparent',
  cursor: 'pointer', color: active ? '#212529' : '#495057', lineHeight: 1.4,
})
const tbSep         = { width: 1, height: 18, background: '#dee2e6', margin: '0 4px' }
const editorContent = { flex: 1, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', cursor: 'text', minHeight: 'inherit' }

// Emoji panel
const emojiPanel = {
  position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
  background: '#fff', border: '1px solid #dee2e6', borderRadius: 8,
  boxShadow: '0 6px 24px rgba(0,0,0,0.14)', width: 300,
  overflow: 'hidden',
}
const catRow = {
  display: 'flex', gap: 0, padding: '6px 6px 4px', borderBottom: '1px solid #f1f3f5',
  background: '#f8f9fa', overflowX: 'auto',
}
const catBtn = (active) => ({
  fontSize: 16, padding: '3px 6px', border: 'none', borderRadius: 4, cursor: 'pointer',
  background: active ? '#e9ecef' : 'transparent', flexShrink: 0,
})
const emojiGrid = {
  display: 'flex', flexWrap: 'wrap', gap: 0,
  maxHeight: 220, overflowY: 'auto', padding: '4px 2px',
}
const emojiBtn = {
  fontSize: 20, width: 36, height: 36, border: 'none', background: 'none',
  cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center',
  justifyContent: 'center', transition: 'background 0.1s',
}
