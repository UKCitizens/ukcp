/**
 * @file theme.js
 * @description UKCP Mantine theme configuration.
 * Defines the confirmed UKCP brand green palette (primary: #2E7D32 at shade 8)
 * and custom breakpoints aligned to layout spec (md = 1024px).
 */

import { createTheme } from '@mantine/core'

/**
 * UKCP brand green — 10-shade palette.
 * Shade 8 (#2E7D32) is the confirmed primary brand colour.
 * @type {string[]}
 */
const ukcpGreen = [
  '#E8F5E9',
  '#C8E6C9',
  '#A5D6A7',
  '#81C784',
  '#66BB6A',
  '#4CAF50',
  '#43A047',
  '#388E3C',
  '#2E7D32',
  '#1B5E20',
]

/**
 * UKCP Mantine theme.
 * breakpoints.md is set to 64em (1024px) to match the layout spec:
 *   - LeftPane collapses below sm (48em / 768px)
 *   - RightPane collapses below md (64em / 1024px)
 * @type {import('@mantine/core').MantineThemeOverride}
 */
export const theme = createTheme({
  primaryColor: 'green',
  primaryShade: 8,
  colors: {
    green: ukcpGreen,
  },
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '64em',
    lg: '80em',
    xl: '88em',
  },
})
