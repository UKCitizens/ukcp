/**
 * @file PageBackground.jsx
 * @description Fixed-position full-viewport background canvas for UKCP.
 * Renders at z-index 0, behind all AppShell content.
 * Default fill is a CSS linear-gradient from #1A3A2A (dark green) to #2E7D32 (mid green).
 *
 * @todo Sprint 3: replace gradient with background-image: url(../../assets/UKBanner.png);
 *   background-size: cover; background-position: center
 */

import { Box } from '@mantine/core'
import classes from './PageBackground.module.css'
import defaultBg from '../../assets/vil-green-ukcp-largeH1.png'

/**
 * Full-screen background canvas rendered at the lowest z-index layer.
 * Position is fixed — does not scroll with page content.
 *
 * When backgroundUrl is provided, the component sets it as a CSS custom property
 * (--bg-url) via the style prop. Using a CSS custom property rather than a plain
 * style attribute keeps the static layout properties (position, size, z-index) in
 * the CSS module where they belong; only the dynamic URL value crosses the boundary.
 *
 * @param {object} props
 * @param {string} [props.backgroundUrl] - Optional image URL. If provided, renders as
 *   background-image covering the full canvas. Defaults to the CSS gradient placeholder.
 * @returns {JSX.Element}
 */
export default function PageBackground({ backgroundUrl = defaultBg }) {
  if (backgroundUrl) {
    return (
      <Box
        className={classes.canvasImage}
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />
    )
  }

  return <Box className={classes.canvas} />
}
